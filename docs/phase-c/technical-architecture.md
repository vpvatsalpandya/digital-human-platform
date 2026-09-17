# Phase C · Technical Architecture

## 1. System overview

```
┌──────────────────────────── Clients ─────────────────────────────┐
│ PWA (Android/iOS) · Desktop web · Examiner app (same PWA, role) │
│ React 19 · Next.js App Router · R3F/three · Zustand · Tailwind   │
└───────────────┬───────────────────────────────┬──────────────────┘
                │ HTTPS (edge)                   │ CDN (assets)
┌───────────────▼────────────────┐   ┌───────────▼─────────────────┐
│ Edge middleware                │   │ Asset CDN                   │
│ host→tenant, auth cookie check │   │ GLB/LOD, KTX2, DZI tiles,   │
│ theme tokens, locale           │   │ slice pyramids, item media  │
└───────────────┬────────────────┘   └─────────────────────────────┘
┌───────────────▼────────────────────────────────────────────────┐
│ Next.js server (containers or Vercel)                          │
│ Server components · route handlers (/api/v1) · server actions  │
│ modules: engine-api, knowledge, physiology, histology,         │
│ embryology, pathology, radiology, assessment, tutor, faculty,  │
│ analytics, tenancy, auth, billing                              │
└───────┬───────────────┬──────────────────┬─────────────────────┘
        │ Prisma        │ ioredis           │ BullMQ jobs
┌───────▼───────┐ ┌─────▼──────┐   ┌────────▼──────────────────────┐
│ PostgreSQL 16 │ │ Redis 7    │   │ Worker (Node): asset pipeline,│
│ + pgvector    │ │ cache/rate │   │ embeddings, segmentation      │
│ + RLS         │ │ /sessions  │   │ (TotalSegmentator in Python   │
└───────────────┘ └────────────┘   │ container), analytics rollups │
                                   └───────────────────────────────┘
External: Claude API (tutor, grading suggestions) · object storage (S3/R2) · email · payments
(Razorpay India, Stripe global) · IdPs (SAML/OIDC) · LMS (LTI 1.3)
```

## 2. Repository layout (`digital-human/`)

```
digital-human/
  src/app/                      # routes (App Router); thin; compose modules
    (learn)/atlas, physiology, histology, embryology, pathology, radiology, assess, tutor
    (faculty)/faculty/...        # authoring, review, analytics
    (admin)/admin/...            # tenant admin
    api/v1/...                   # route handlers (REST); versioned
  src/engine/                    # Digital Human Engine (R3F): loader, LOD, selection, clip,
                                 # explode, camera, picking (BVH), views, bookmarks
  src/modules/<name>/            # domain modules; each exports index.ts only
  src/knowledge/                 # Zod schema, seed, citation model, review workflow
  src/simulations/               # numerical models (pure TS; no React)
  src/store/                     # Zustand stores (engine, session, ui)
  src/lib/                       # db (Prisma + tenant extension), redis, auth, entitlements,
                                 # i18n, telemetry, http
  src/components/                # shared UI (design tokens, primitives)
  prisma/schema.prisma           # Phase D
  content/manifests/             # asset manifests with licence + attribution
  scripts/                       # asset pipeline, licence report, seed
  tests/                         # vitest: unit (simulations, schema, scoring), integration
  infra/                         # Dockerfile, compose, k8s manifests, vercel.json
```

Rule: `src/app` imports modules; modules import `engine`, `knowledge`, `simulations`, `lib`;
never the reverse. Enforced by `eslint-plugin-boundaries`-style rules (configured in
`.eslintrc`).

## 3. Runtime choices and rationale

| Concern | Choice | Why | Alternatives | Trade-offs / risks |
|---|---|---|---|---|
| Framework | Next.js 15 App Router | Server components cut client JS; route handlers + middleware; Vercel and container parity | Remix, SPA + Fastify | Vendor gravity; mitigated by Docker output=standalone |
| React version | 19.2 | Required by R3F 9 | 18 + R3F 8 | Ecosystem catch-up |
| 3D | three + R3F 9 + drei + three-mesh-bvh | Declarative scene, hooks, mature ecosystem; BVH for fast picking on 2k meshes | Babylon.js (heavier, fewer React bindings), PlayCanvas | R3F re-render discipline needed (use transient store updates) |
| State | Zustand 5 | Small, transient subscriptions outside React for per-frame | Redux, Jotai | See ADR-008 |
| Styling | Tailwind 3.4 + CSS variables | Token theming without builds | Tailwind 4 (fine, newer), CSS modules | Class bloat; use component primitives |
| ORM | Prisma 7 (Postgres) | Typed schema, migrations, client extensions for tenant scoping | Drizzle (lighter), Kysely | Prisma engine size on serverless — use library engine / Accelerate on Vercel |
| DB | PostgreSQL 16 + pgvector + btree_gist | RLS, JSONB for records, vectors, exclusion constraints for exam scheduling | MySQL, Mongo | None serious |
| Cache/queue | Redis 7 + BullMQ | ADR-010 | SQS, RabbitMQ | Redis persistence config for queues |
| Auth | Auth.js v5 (credentials, OIDC, SAML via BoxyHQ/Jackson) | Framework-native; SAML via proven bridge | Keycloak (heavy ops), Clerk (cost/residency) | SAML edge cases per IdP |
| LMS | LTI 1.3 via `ltijs`-style implementation in module | Institutional requirement | — | Certification effort |
| Search | Postgres FTS + pg_trgm for server; client-side MiniSearch-style index for structures | Sub-100 ms on device | Elastic/Meilisearch | Add Meilisearch if item-bank search grows |
| AI | Claude (Anthropic SDK) with structured outputs; embeddings via provider-agnostic interface | Strong instruction following for citation constraints | Open-weights hosted (later, for cost) | Cost; quota per seat |
| Observability | OpenTelemetry → OTLP collector; Sentry for errors; RUM beacon for render timings | Standard | — | — |
| Payments | Razorpay (India), Stripe (global), invoices for institutions | Market fit | — | Two integrations |
| Storage | S3-compatible (AWS S3 / Cloudflare R2) + CDN (CloudFront/Cloudflare) | Egress cost for assets | — | — |

## 4. Request lifecycle (tenant-aware)

1. Edge middleware resolves `host` → `tenantId` (Redis, fallback DB), reads session cookie,
   sets `x-tenant-id`, `x-user-role`, `x-locale` headers, and injects theme tokens.
2. Server components call `db.forTenant(tenantId)` which wraps queries in a transaction that
   runs `SET LOCAL app.tenant_id = $1` (Prisma client extension). RLS policies enforce.
3. Route handlers validate with Zod, check entitlements (`can(tenant, feature)`), and return
   typed JSON; errors follow RFC 9457 problem details.
4. Mutations that fan out (publish record → re-embed, exam publish → notify) enqueue BullMQ
   jobs; the worker runs the same module code.

## 5. Module contracts (public surface)

Each module exposes: `types.ts`, `service.ts` (server), `client.ts` (browser-safe), and
`routes.ts` (handlers). Example — `assessment`:
- `createAssessment(tenantCtx, input)`, `publish(id)`, `startAttempt(userId, id)`,
  `submitResponse(attemptId, itemId, response)`, `score(attemptId)`, `itemAnalysis(id)`.
- Scoring strategies are pure functions in `assessment/scoring/*.ts` with 100% unit coverage.

## 6. Asset pipeline (build-time; details Phase G)

Blender/CLI → glTF → `gltf-transform` (dedupe, weld, simplify per LOD, meshopt, Draco, KTX2)
→ manifest generation (bounds, centroid, system, FMA ID, licence) → upload to object storage
→ CDN with immutable hashed URLs. Runs as a BullMQ job for faculty-uploaded assets and as a
CI script for the open pack.

## 7. Offline and low bandwidth

- Service worker (Workbox via `next-pwa`-style config): app shell precache; runtime cache for
  assets by system with size caps; records cached on view; IndexedDB for bookmarks/views queue
  and exam responses (signed, replayed on reconnect).
- Low-bandwidth flag → LOD2 only, no textures, lazy modules, image quality 40.

## 8. Security

- RLS as the last line; entitlement checks at handler; CSRF via same-site cookies + origin
  check; rate limits per seat and tenant; signed asset URLs for tenant-private media; content
  security policy with hashed inline scripts; secrets via environment/KMS; audit log table
  for admin and faculty actions; PII minimisation (tutor receives no names/emails).
- Exams: server-authoritative timing; response signing with per-attempt key; randomised
  item order; proctoring hooks (webcam) deferred, not in v1.

## 9. Deployment topologies

| Target | How |
|---|---|
| Vercel | Next app with `output: 'standalone'` disabled; Prisma with driver adapter; worker deployed separately (Fly/Render/K8s) since queues need long-lived processes |
| AWS | ECS/EKS: `web` (Next standalone), `worker`, `segmenter` (Python) containers; RDS Postgres with pgvector; ElastiCache; S3 + CloudFront; ALB; Secrets Manager |
| Kubernetes | Helm chart in `infra/k8s`: Deployments (web, worker), HPA on CPU/RPS, PDBs, cert-manager for tenant domains, external-secrets |
| Docker Compose | Local dev: postgres, redis, minio, web, worker |

## 10. Scalability plan

- Stateless web tier; sticky sessions unnecessary; Redis-backed exam sessions.
- Read replicas for analytics queries; materialised views refreshed by worker.
- Event tables (`LearningEvent`) partitioned monthly; roll-ups nightly; raw retention 13 months.
- CDN offloads > 95% of bytes; origin sees API only.
- Target: 100k concurrent learners per region on 6 web pods + 2 workers + db.r6g.2xlarge.

## 11. Alternatives rejected at system level
- **Separate backend in NestJS**: more ceremony, duplicate types; Next route handlers suffice
  with module boundaries.
- **GraphQL**: over-fetching not our problem; REST + server components simpler for caching.
- **Unity/Unreal WebGL**: bundle sizes (20 MB+) fail the mobile target.
