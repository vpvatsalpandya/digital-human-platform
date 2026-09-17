# Migration notes

`prisma migrate dev` generates the DDL for the models. The following hand-written SQL is
appended to the generated `migration.sql` (Prisma cannot express these):

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Row-level security on every tenant-owned table (Phase D §3)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'TenantBranding','TenantDomain','SsoConfig','Department','Cohort','Subscription',
    'Membership','TenantRecordOverlay','TenantCase','Lesson','Assessment','Attempt',
    'SavedView','Bookmark','LearningEvent','Mastery','TutorConversation','AuditLog',
    'ErrorReport'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("tenantId" = current_setting(''app.tenant_id'', true)) WITH CHECK ("tenantId" = current_setting(''app.tenant_id'', true))',
      t);
  END LOOP;
END $$;

-- Items: global bank rows (tenantId IS NULL) readable by all tenants
ALTER TABLE "Item" ENABLE ROW LEVEL SECURITY;
CREATE POLICY item_read ON "Item" FOR SELECT
  USING ("tenantId" IS NULL OR "tenantId" = current_setting('app.tenant_id', true));
CREATE POLICY item_write ON "Item" FOR ALL
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

-- Full-text search on derived record fields
ALTER TABLE "RecordField" ADD COLUMN tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(text, ''))) STORED;
CREATE INDEX recordfield_tsv ON "RecordField" USING gin (tsv);
CREATE INDEX structurealias_trgm ON "StructureAlias" USING gin (name gin_trgm_ops);

-- Vector index for tutor retrieval
CREATE INDEX recordchunk_embedding ON "RecordChunk" USING hnsw (embedding vector_cosine_ops);

-- OSCE room double-booking is impossible by construction
ALTER TABLE "Station" ADD CONSTRAINT station_room_no_overlap
  EXCLUDE USING gist ("roomId" WITH =, tstzrange("startsAt", "endsAt") WITH &&)
  WHERE ("roomId" IS NOT NULL AND "startsAt" IS NOT NULL);

-- Publishing guard: no non-empty field without a citation (Phase E §2)
CREATE OR REPLACE FUNCTION check_record_citations() RETURNS trigger AS $$
DECLARE k text; v jsonb;
BEGIN
  IF NEW.status IN ('APPROVED','PUBLISHED') THEN
    FOR k, v IN SELECT * FROM jsonb_each(NEW.fields) LOOP
      IF (v->>'value') IS NOT NULL AND length(trim(v->>'value')) > 0
         AND jsonb_array_length(coalesce(v->'citations','[]'::jsonb)) = 0 THEN
        RAISE EXCEPTION 'field % has content but no citation', k;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER record_version_citations BEFORE INSERT OR UPDATE ON "RecordVersion"
  FOR EACH ROW EXECUTE FUNCTION check_record_citations();
```

LearningEvent partitioning by month is applied when the table is converted with
`CREATE TABLE ... PARTITION BY RANGE ("createdAt")` in a follow-up migration (Sprint 7).
