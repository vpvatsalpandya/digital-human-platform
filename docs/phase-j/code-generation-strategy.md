# Phase J · Code Generation Strategy

How the team (humans and AI coding agents) produces code so that volume does not erode
quality, and how generated content is kept out of the medical knowledge base.

## 1. What may be generated, by whom

| Artefact | Generation allowed | Guardrail |
|---|---|---|
| UI components, route handlers, tests, infra manifests | AI-assisted, human-reviewed | Lint boundaries, type-check, tests, PR review |
| Numerical simulation code | AI-assisted drafting from cited equations | Validation tests against published ranges; equations and sources in the module header |
| Prisma schema/migrations | Human-authored; AI for boilerplate | Migration review checklist (RLS, indexes, partitions) |
| Knowledge record text | **Never generated from model knowledge.** AI may summarise an author-supplied source excerpt only | `aiAssisted` flag; cannot publish without human edit + review; citation required |
| Assessment items | AI may draft items *from a published record*, tagged | Faculty approval before use; psychometric review after use |
| Tutor responses | Runtime RAG only | Citation validator; refusal path; logged and sampled for QA |
| Translations of UI strings | AI draft | Human review per locale |
| Translations of record content | AI draft from approved source text | Medical reviewer per language before publish |

## 2. Repository conventions that make generation safe
- **Module boundaries** enforced by lint: generated code cannot reach across modules.
- **Schemas first**: Zod schemas and Prisma models are written before UI; generators derive
  forms and API types from them (`zod-to-ts`, OpenAPI from route metadata).
- **Golden tests**: simulations have golden outputs; scoring has table-driven tests;
  knowledge publishability has property-based tests.
- **Scaffold generators** (`scripts/scaffold/*.ts`): `module`, `route`, `store`, `simulation`,
  `item-type`. Each produces files with TODO markers and tests that fail until implemented.
- **Prompts as code**: tutor and authoring prompts live in `src/modules/tutor/prompts/*.md`
  under version control with evals in `tests/evals`.

## 3. AI coding agent workflow
1. Ticket → agent reads the relevant Phase doc section and module `README`.
2. Agent writes code + tests in a branch; CI runs typecheck, lint, tests, bundle-size budget
   (atlas route ≤ 250 kB gz), and the licence manifest check.
3. Human review focuses on: boundaries, tenant scoping (`db.forTenant` used?), entitlement
   checks, accessibility, and any medical content touched (must be zero).
4. Merge → preview deploy → device-lab smoke for engine changes.

## 4. Content generation pipeline (non-code)
- Source ingestion (OpenStax CC BY) → section chunks with locators → author picks excerpts →
  optional AI summary → author edits → citation attached automatically from the excerpt →
  reviewer approves → publish → chunk + embed for RAG.
- Every step records provenance; the record UI can show "derived from OpenStax §19.1".

## 5. Evaluation sets
- `tests/evals/tutor/*.jsonl`: questions with expected cited records and questions that must
  be refused (out-of-KB, clinical management). CI fails if refusal rate on the must-refuse set
  < 100% or citation validity < 100%.
- `tests/evals/scoring/*.json`: spotter answers with synonyms, misspellings, laterality.

## 6. Why this approach
Generation speeds up the 80% of code that is plumbing; the 20% that carries medical truth is
walled off. Alternatives considered: unrestricted AI content generation with post-hoc review
(review cannot keep up; errors reach students), or no AI assistance (slower, no safety
benefit). Risk: teams drifting to "just generate it" for content — mitigated by the schema
making it impossible to save text without a source.
