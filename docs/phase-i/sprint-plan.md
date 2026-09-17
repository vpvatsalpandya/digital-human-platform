# Phase I · Sprint-by-Sprint Execution Plan (2-week sprints, first 6 months)

Each sprint lists goal, stories, and the demo that proves it. Stories reference PRD IDs.
Sprints 0–3 correspond to the code shipped in this repository (see root README for what is
real versus scaffolded).

## Sprint 0 · Foundations (this repo)
Goal: a running, multi-tenant, mobile-first skeleton with the engine rendering.
- Repo, TypeScript strict, ESLint boundaries, Vitest, CI (typecheck, lint, test, build).
- Prisma schema (Phase D) with tenancy, content, assessment, learning domains.
- Tenant resolution middleware, theme tokens, entitlements function.
- Engine: R3F canvas, loader abstraction (manifest → meshes), procedural demo body for
  development without assets, selection with BVH, isolate/hide/fade/explode/transparency/
  clip, saved views and bookmarks (local persistence + API stubs).
- Knowledge: Zod schema, seed records with OpenStax citations, publishability check.
- Simulations: cardiac elastance model, Hodgkin–Huxley; unit tests against textbook ranges.
- Module scaffolds: histology deep-zoom viewer, embryology timeline, pathology comparator,
  radiology slice viewer with 3D sync, quiz/spotter engine, tutor API (RAG over seed), faculty
  and dashboard pages.
- Infra: Dockerfile, compose, k8s manifests, Vercel config.
Demo: on a phone, load the demo body, isolate a structure, read its cited record, run the
cardiac simulation, take a 5-item spotter, ask the tutor.

## Sprint 1 · Asset pipeline and real meshes
- `scripts/assets/*`: Blender export of Z-Anatomy, gltf-transform LODs, meshopt/Draco/KTX2,
  manifest with licence; upload to CDN.
- Engine loads real manifest; system packs; progressive LOD; memory governor.
- Device lab baseline on Redmi Note-class; budgets recorded.
Demo: full male skeleton + muscles at LOD2 in < 4 s on 4G.

## Sprint 2 · Atlas UX and knowledge authoring
- Bottom-sheet structure card with tabs; search with aliases; compare mode.
- Authoring UI with source picker and citation enforcement; review queue; versions.
- 100 records authored (upper limb).
Demo: reviewer approves a record and it appears live with citations.

## Sprint 3 · Auth, tenancy, faculty portal v0
- Auth.js with credentials + OIDC; roles; cohort import CSV; RLS migrations; audit log.
- Faculty lesson builder ("capture view").
Demo: two tenants with different branding on two hosts; a lesson published to a cohort.

## Sprint 4 · Assessment v1
- Item bank, spotter builder (pin in 3D/slide), quiz types, exam runner with server timer,
  synonym-aware scoring, item analysis.
Demo: 30-station spotter for a cohort; scores and item analysis by the end of the demo.

## Sprint 5 · Histology and radiology with partner content
- Slide ingestion (SVS/TIFF → DZI tiles), annotation tool, guided/self/assessment modes.
- NIfTI/DICOM → slice pyramids; mask overlays; 3D↔slice sync from TotalSegmentator labels.
Demo: select pancreas in 3D, see it on CT; identify it in assessment mode.

## Sprint 6 · Physiology suite
- Respiratory mechanics + gas exchange, nephron, synaptic transmission, endocrine axes;
  predict-observe-explain UI; equations drawer.
Demo: change FiO2 and watch alveolar and arterial PO2 respond.

## Sprint 7 · Tutor and analytics
- Chunking + embeddings worker; hybrid retrieval; citation validator; refusal; modes.
- Event pipeline, mastery (BKT), student and faculty dashboards.
Demo: tutor answers with chips linking to records; faculty heatmap highlights weak regions.

## Sprint 8 · Design partner go-live
- SSO (SAML via Jackson), roster sync, error reporting SLA tooling, offline exam runner.
- Performance hardening; accessibility audit.
Demo: real cohort at partner college runs a spotter on their own phones.

## Sprint 9 · Female body and pathology
- HRA organs integration; adapted skeleton with "reference derived" flags; pathology pairs and
  overlays; OSPE/OSCE station templates and examiner app.

## Sprint 10 · Embryology v1 and viva
- Timeline content (Carnegie stages, week-by-week) from OpenStax + cited sources; illustrated
  stages; anomaly branches; viva question sets with examiner rubric and practice mode.

## Sprint 11 · Admin, billing, LTI
- Admin dashboards, plans/entitlements UI, Razorpay/Stripe, invoices; LTI 1.3 tool
  registration and deep linking.

## Sprint 12 · GA hardening
- Pen test fixes, SOC 2 controls, load test (100k concurrent simulated), docs, runbooks.

## Definition of done (every sprint)
Typecheck, lint, unit tests green; device-lab budget check for engine changes; accessibility
check for new screens; docs updated; licence manifest updated for any new asset.
