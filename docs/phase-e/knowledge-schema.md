# Phase E · Knowledge Schema

Source of truth: `src/knowledge/schema.ts` (Zod). This document explains the model.

## 1. Entities

- **Structure**: canonical anatomical entity. `id`, `fmaId?`, `uberonId?`, `ta2Code?`,
  `snomedId?` (gated), `name`, `latinName?`, `aliases[]`, `systemIds[]`, `regionIds[]`,
  `category` (organ | bone | muscle | nerve | artery | vein | lymphatic | gland | ligament |
  joint | fascia | skin | region | landmark | other), `parentId?` (partonomy), `laterality`
  (none | left | right | bilateral), `sexPresence` (both | male | female).
- **KnowledgeRecord**: one per structure; `publishedVersion`, `versions[]`.
- **RecordVersion**: `fields` (see §2), `status`, `author`, `reviewers[]`, `createdAt`,
  `approvedAt?`, `changeSummary`.
- **Citation**: `sourceId`, `locator` (chapter/section/page/figure/URL fragment), `quote?`
  (≤ 300 chars, only for CC BY sources), `fieldKey`, `note?`.
- **Source**: `type`, `title`, `authors`, `year`, `edition?`, `publisher?`, `doi?`, `url?`,
  `licence` (e.g., CC-BY-4.0, proprietary-cited-only), `attributionText`.

## 2. Required fields (the 20)

| Key | Type | Notes |
|---|---|---|
| name | string | Preferred English term (TA2 English where available) |
| alternativeNames | string[] | Common, eponymous, regional |
| latinName | string | TA2 Latin |
| category | enum | As above |
| description | rich text | What/where; ≤ 200 words in `mbbs`, mode variants allowed |
| function | rich text | |
| relations | structured: `{ anterior, posterior, superior, inferior, medial, lateral, contents?, boundaries? }` each string[] of structure refs or text | Structure refs link to IDs |
| bloodSupply | structured list `{ structureRef | text, note? }` | |
| venousDrainage | same | |
| lymphaticDrainage | same | |
| innervation | structured list `{ nerveRef, fibreType?, rootValue?, note? }` | |
| histology | rich text + `slideRefs[]` | |
| embryology | rich text + `stageRefs[]` + `germLayer?` | |
| physiology | rich text + `simulationRefs[]` | |
| clinicalSignificance | list of `{ title, text, competencyRefs[] }` | |
| surgicalRelevance | list | |
| commonDiseases | list of `{ name, text, pathologyPairRef? }` | |
| radiologicalCorrelation | list of `{ modality, text, imagingCaseRef?, sliceIndex? }` | |
| examinationPearls | list of `{ text, examType (spotter\|viva\|osce\|written) }` | |
| references | Citation[] (aggregated, plus general reading) | |

Each field value is wrapped as `{ value, citations: Citation[], modes?: { [mode]: value } }`.
**Publish rule:** `value` non-empty ⇒ `citations.length ≥ 1`. Enforced in Zod
(`publishableRecord`) and by DB trigger.

## 3. Mode variants
`modes.school`, `modes.nursing`, … override `value` for that audience. Absent → fall back to
base value, unless the field is mode-restricted (e.g., `surgicalRelevance` is hidden in
`school` and `neet` by policy table `fieldVisibilityByMode`).

## 4. Provenance and anti-hallucination controls
- Author must attach a citation before saving a non-empty field; the UI does not allow free
  text without a source picker.
- Sources of type `oer` with permissive licence may carry a quote; proprietary textbooks are
  cited (title, edition, page) but never quoted beyond fair-use fragments.
- AI-assisted drafting (optional for authors) is only allowed to *summarise a selected source
  excerpt* the author pasted; the generated text is tagged `aiAssisted: true` and cannot be
  published without human edit + reviewer approval.
- Every published version records the reviewer identity and credential tag.

## 5. Review workflow

```
draft ──submit──▶ in_review ──approve──▶ approved ──publish──▶ published ──▶ deprecated
   ▲                  │ request changes                             │
   └── changes_requested ◀───────────────────────────── error report (learner/faculty)
```
Roles: author (content team or faculty), reviewer (credentialed), editor (publishes).
Checks at `approve`: citation completeness, mode-visibility policy, term consistency
(name/latin/aliases unique across structures), link validity (refs resolve), readability
score per mode. Reviewer UI shows citation excerpts side-by-side.

## 6. Tenant overlays
`TenantRecordOverlay.fields` uses the same field wrapper; merge rule: overlay values are
appended (clinical cases, local notes) not replacing global text, except `examinationPearls`
which may be replaced per tenant. Overlays follow a lighter tenant-internal review.

## 7. Asset and content manifests
`content/manifests/<pack>.json`: `{ pack, version, licence, attribution, source, retrievedAt,
items: [{ structureId, fmaId, files, lods, checksum }] }`. The attribution page is generated
from manifests, so a new pack cannot ship without attribution.

## 8. Retrieval representation for the tutor
Each published version is chunked per field (`RecordChunk`: structureId, fieldKey, mode,
text, citations, embedding). Chunk text prefixes structure name and field label to improve
retrieval. Hybrid search = BM25 (Postgres FTS) ∪ vector (pgvector) → reciprocal rank fusion.

## 9. Alternatives considered
- Free-form markdown per structure: rejected (cannot enforce citations or mode gating).
- Full RDF/OWL knowledge graph: rejected for v1 (tooling and team cost); FMA IDs keep the
  door open.
