# Digital Human Learning Platform (codename Vesalia)

Mobile-first medical education platform: a 3D digital human with cited, faculty-reviewed
knowledge, real physiology simulations, a virtual microscope, an embryology timeline,
pathology comparison, radiology synchronised with the atlas, six assessment modes, a
retrieval-only AI tutor, and multi-tenant white-label SaaS plumbing.

This directory is self-contained (its own `package.json`) and lives alongside the Turf
Community app in the same repository by request; nothing in the host app is touched.

## Planning documents (Phases A–J)

All planning output is under [`docs/`](docs/00-index.md): executive vision, PRD, market and
competitor analysis, **licensing audit** (which sources are commercially usable and which are
excluded), personas, journeys, revenue and SaaS models, white-label strategy, go-to-market,
educational architecture, technical architecture, database schema, knowledge schema, UX
specification, rendering architecture, roadmap, sprint plan, code-generation strategy, and
architecture decision records. Implementation started only after those were written.

## Quick start

```bash
cd digital-human
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
| Digital Human Engine (`src/engine`, `src/store/engine.ts`) | R3F viewer; male/female bodies; 14 system toggles; search (name/alias/Latin/FMA, fuzzy); select, multi-select, isolate, isolate-with-region, hide, fade, explode, global transparency, axial/coronal/sagittal clipping, saved views, bookmarks, deep links, accessible list view; BVH picking; adaptive DPR and demand-driven frameloop; LOD chooser and GLB loader (meshopt/Draco/KTX2) | Meshes are **procedural stand-ins**; the Z-Anatomy/HRA asset pipeline (Sprint 1) produces the real manifests. Compare mode UI is not wired yet. |
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

`npm run typecheck`, `npm run lint`, `npm test` (46 tests) and `npm run build` pass. The built
app was driven in headless Chromium at a 390x844 mobile viewport: the 3D canvas renders, search
selects and frames a structure and opens its cited record, and every route returns 200 with no
console or hydration errors. Tenant resolution was checked by requesting the same build with a
second `Host` header and getting the second tenant's brand back.

Known gaps, both tracked in the roadmap:

- The atlas route's first-load JS (463 kB) is above the PRD's 250 kB target because three.js
  and the engine sit in the client bundle. The engine already loads on demand; next steps are
  tree-shaking drei and moving the decoders to workers (Phase G).
- Histology annotation labels can overlap at low magnification, and the zoom presets sit close
  to the placeholder banner. Cosmetic, fixed when real slides replace the schematics.

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
