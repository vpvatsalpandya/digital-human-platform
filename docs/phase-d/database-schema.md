# Phase D · Database Schema

Source of truth: `prisma/schema.prisma`. This document explains the design; the schema file
is authoritative for fields.

## 1. Domains and tenancy

| Domain | Tenant-owned? | Notes |
|---|---|---|
| Tenancy: Organisation, Tenant, Department, Cohort, Membership, Role, Entitlement, Branding, Domain, SsoConfig, Subscription, Invoice | Yes (except Organisation) | RLS on all |
| Identity: User, Account, Session (Auth.js) | User is global; Membership binds to tenant | A user may belong to multiple tenants (faculty at two colleges) |
| Global content: Body, System, Region, Structure, StructureAlias, Asset, AssetLod, KnowledgeRecord, RecordVersion, RecordField, Citation, Source, Slide, SlideAnnotation, EmbryoStage, PathologyPair, ImagingCase, ImagingSeries, Simulation, CurriculumFramework, Competency, mapping tables | No | Read-only to tenants; edited by content team via review workflow |
| Tenant content: TenantRecordOverlay, TenantCase, Lesson, LessonStep, Assessment, Item, ItemOption, ItemMedia, Station, Attempt, Response, Score, VivaSession | Yes | RLS |
| Learning: SavedView, Bookmark, LearningEvent, Mastery, TutorConversation, TutorMessage | Yes | Partitioned events |
| Ops: AuditLog, Job, Feedback/ErrorReport | Yes | — |

## 2. Key design decisions

1. **JSONB for record fields, typed by Zod at the edge.** `RecordVersion.fields` stores the 20
   knowledge fields as JSONB validated against the Phase E schema; `RecordField` rows are
   *derived* (one per field per version) for indexing, citation joins and FTS. Why: the field
   set evolves; JSONB keeps versions immutable and complete; derived rows keep queries fast.
   Alternative: 20 columns (rigid, migration per field). Risk: drift between JSON and derived
   rows — the worker rebuilds derived rows from JSON; JSON is authoritative.
2. **Immutable versions.** `KnowledgeRecord` points to `publishedVersionId`; versions never
   change after `approved`. Diffs computed from JSON.
3. **Citations are first-class.** `Citation(sourceId, locator, quote?, fieldKey, versionId)`;
   `Source` has type (textbook, OER, dataset, journal), licence, and canonical URL/DOI.
   Publishing is blocked by a DB trigger if any non-empty field lacks a citation.
4. **Assets by structure and LOD.** `Asset(structureId, bodyId, kind)` → `AssetLod(level,
   url, bytes, triangles, hash)`; manifest generated from these rows.
5. **Assessment attempts store raw responses**, scoring is re-runnable (`Score` rows carry the
   scorer version) so a synonym-table fix can be re-applied.
6. **LearningEvent** is append-only, partitioned by month (`createdAt`), with a compact
   `type` enum and JSONB payload; roll-ups in `Mastery` and materialised views.
7. **Tenant overlays** never modify global rows; `TenantRecordOverlay(structureId, tenantId,
   fields JSONB)` is merged at read time.
8. **Scheduling safety.** Station bookings for OSCE rooms use an exclusion constraint
   (`btree_gist`) on `(roomId, period)`; the same pattern the host repo uses for turf slots.

## 3. Row-level security

For each tenant-owned table:
```sql
ALTER TABLE "Assessment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Assessment"
  USING ("tenantId" = current_setting('app.tenant_id', true)::uuid);
```
The application role has no BYPASSRLS. A platform-admin role connects separately for
cross-tenant operations (support, benchmarking) with audit logging. Prisma migrations carry
the policies in `prisma/migrations/*/migration.sql` (Prisma does not model RLS natively).

## 4. Indexing highlights
- `Structure(fmaId)` unique; `StructureAlias(name gin_trgm_ops)`; `RecordField` FTS
  (`tsvector` generated column); `RecordChunk(embedding vector(1024))` HNSW; `Item(tenantId,
  mode, systemId)`; `LearningEvent(tenantId, userId, createdAt)`; `Mastery(tenantId, userId,
  structureId)` unique.

## 5. Retention and privacy
- Learner PII limited to name, email/phone, cohort; tutor conversations pseudonymised; export
  and delete endpoints per DPDP/GDPR; event retention 13 months raw, aggregates indefinitely.

## 6. Migration strategy
- Prisma Migrate with hand-written SQL steps for RLS, partitions, generated columns and
  extensions; CI applies the full chain from scratch (pattern proven in the host repo);
  zero-downtime rules: additive first, backfill via worker, then constrain.

## 7. Scalability
- Global content ~10k structures × versions: small. Tenant content grows with items and
  attempts: millions of `Response` rows per large tenant per year; indexed by attempt.
- Events: 600k learners × ~200 events/day ≈ 120M rows/day at scale → move to a columnar
  store (ClickHouse) at year 2; the event schema is designed to be exportable as-is.
