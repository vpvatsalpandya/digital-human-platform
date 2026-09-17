# Architecture Decision Records

Format: Context → Decision → Alternatives → Trade-offs → Risks → Scalability.

| ADR | Title |
|---|---|
| 001 | Open assets first, commissioned assets second |
| 002 | Institution-led content partnerships |
| 003 | One codebase, three surfaces (PWA, responsive web, optional Capacitor) |
| 004 | Modular monolith on Next.js with enforced module boundaries |
| 005 | Shared-schema multi-tenancy with Postgres RLS, dedicated DB for residency tiers |
| 006 | FMA as canonical structure identifier |
| 007 | Per-structure GLB streaming with meshopt + Draco + KTX2 and build-time LODs |
| 008 | Zustand for engine state; React Query-free server state via server components + route handlers |
| 009 | RAG-only AI tutor with citation enforcement and refusal below threshold |
| 010 | Redis for tenant resolution cache, rate limits, session store, and BullMQ queues |
| 011 | WebGL 2 now, WebGPU behind a capability flag via three's WebGPURenderer |
| 012 | pgvector for embeddings in v1; external vector DB only if > 50M chunks |
| 013 | Assessment scoring is deterministic first; AI-assisted grading always flagged for review |
| 014 | Design tokens as CSS variables for white-label theming |

Records follow.

---

## ADR-001 Open assets first, commissioned assets second
**Context.** A full commissioned model set costs USD 250–400k and 12+ months. Open sets
(Z-Anatomy/BodyParts3D CC BY-SA, HRA CC BY 4.0, Open Anatomy Slicer licence) are commercially
usable today. **Decision.** Ship v1 on open assets in a public CC BY-SA asset pack;
commission the proprietary set from revenue. **Alternatives.** Commission first (slow,
capital-heavy); license from a commercial model vendor (per-seat royalties conflict with
band-A pricing). **Trade-offs.** SA meshes stay public; fidelity below incumbents in v1.
**Risks.** Competitors reuse our cleaned pack — acceptable; the platform is the moat.
**Scalability.** Asset pipeline is identical for open and commissioned sets.

## ADR-002 Institution-led content partnerships
**Context.** Best open histology and embryology sources are NonCommercial. **Decision.**
Design partners scan slides and contribute de-identified cases under co-ownership; we fund
scanning and review. **Alternatives.** Buy slide libraries (expensive, exclusivity issues);
generate synthetic slides (unacceptable for education). **Trade-offs.** Slower initial
library; dependency on partner throughput. **Risks.** Consent/de-identification burden —
mitigated by a standard protocol and IRB-style review at partner. **Scalability.** Each new
partner adds content; contract template reusable.

## ADR-003 One codebase, three surfaces
**Decision.** PWA (installable, offline cache, push) is the mobile product; responsive web on
desktop; Capacitor wrapper only for Enterprise app-store requirements. **Alternatives.**
React Native + separate engine (two renderers, two teams); Unity WebGL (huge bundles, poor
mobile web). **Trade-offs.** No native-only APIs (background download limits); iOS PWA
storage quotas. **Risks.** iOS storage eviction — mitigated by re-fetch on demand and
persistent storage request. **Scalability.** One deploy pipeline.

## ADR-004 Modular monolith on Next.js
**Decision.** Single Next.js app; modules under `src/modules/<name>` with public `index.ts`
and an ESLint boundary rule; background jobs in a separate worker process sharing the same
packages. **Alternatives.** Microservices (operational cost unjustified below ~30 engineers);
separate SPA + API (loses server components and edge middleware). **Trade-offs.** Deploy
coupling. **Risks.** Boundary erosion — enforced by lint and CI. **Scalability.** Extract a
module (e.g., assessment) to a service when its team or load justifies it; boundaries make
that a move, not a rewrite.

## ADR-005 Shared-schema multi-tenancy with RLS
**Decision.** `tenantId` on every tenant-owned table; RLS policies keyed on
`current_setting('app.tenant_id')`; Prisma client extension sets it per transaction; global
content tables have no tenant. Enterprise residency tier gets a dedicated database (same
schema, connection chosen by tenant). **Alternatives.** Schema-per-tenant (migration fan-out
at 250+ tenants); database-per-tenant for all (cost). **Trade-offs.** RLS adds a per-query
predicate; noisy-neighbour risk — mitigated by rate limits and read replicas.
**Risks.** A query path that forgets to set tenant context — RLS denies rather than leaks.
**Scalability.** Horizontal read replicas; partition large event tables by tenant and month.

## ADR-006 FMA as canonical identifier
**Decision.** `Structure.fmaId` is the primary external key; UBERON and TA2 as cross-refs;
SNOMED CT optional and gated. **Alternatives.** TA2 codes (document licence ND; less
machine-friendly); own IDs only (no interoperability). **Trade-offs.** FMA has gaps for
surface anatomy and fascial layers — own IDs with `fmaId = null` allowed, flagged for
review. **Scalability.** Enables mapping to research datasets (HuBMAP uses UBERON/FMA).

## ADR-007 Per-structure GLB streaming with build-time LODs
**Decision.** Each structure is a GLB with 3 LODs (meshopt simplification), meshopt+Draco
compressed, KTX2 textures; a manifest per body lists structures, systems, bounds, LOD sizes.
Client streams by system and view frustum priority. **Alternatives.** One big GLB per system
(faster on desktop, fails on mobile memory); server-side rendering/pixel streaming (cost,
latency, offline impossible). **Trade-offs.** Many small requests — HTTP/2 and CDN handle;
batching into system-level packs for LOD2 to reduce request count. **Scalability.** CDN-only
serving; no origin load.

## ADR-008 Zustand for engine state
**Decision.** Engine state (visibility, selection, camera, clip, explode) in Zustand stores
with transient updates outside React for per-frame values; server state via server
components and route handlers, with a thin fetch wrapper, no client cache library in v1.
**Alternatives.** Redux (boilerplate), Jotai (fine, less conventional for R3F), React Query
(adds bundle; revisit when client mutations proliferate). **Trade-offs.** Manual cache
invalidation for a few client mutations.

## ADR-009 RAG-only AI tutor
**Decision.** Retrieval over published records (pgvector + BM25 hybrid); the model receives
only retrieved chunks and must cite; a validator rejects responses whose citations do not
match retrieved chunk IDs; below a similarity threshold, the tutor declines.
**Alternatives.** Fine-tuned model (still hallucinates; expensive to update); open-web
grounding (unreviewed content). **Trade-offs.** Cannot answer outside the knowledge base —
that is the point. **Risks.** Over-refusal — tuned by threshold and by "nearest records"
suggestions. **Scalability.** Retrieval cost is DB-bound; cache frequent Q&A per mode.

## ADR-010 Redis roles
Tenant-by-host cache, rate limiting (per seat, per tenant), session store for exam runners,
BullMQ queues (asset processing, segmentation, analytics roll-ups, embeddings). Single
managed Redis per region; queues on a separate logical DB.

## ADR-011 WebGL 2 now, WebGPU flagged
Three's WebGPURenderer with TSL materials is production-capable on Chrome Android/desktop but
not universal. Engine materials are written as TSL node materials where they differ from
standard PBR so both backends work; renderer chosen by capability flag and tenant/user
opt-in. Migration criteria in Phase G §10.

## ADR-012 pgvector in v1
Embeddings in Postgres avoid another system; HNSW index; expected corpus < 5M chunks for
years. Revisit if latency p95 > 150 ms at scale.

## ADR-013 Deterministic scoring first
Spotter/quiz scoring uses synonym tables and rubrics; AI-assisted grading of short answers
is produced as a suggestion flagged for examiner confirmation; never final on its own.

## ADR-014 Design tokens as CSS variables
Tenant theme = JSON tokens → CSS variables at layout; Tailwind config references variables;
contrast validated on save.
