# Digital Human Learning Platform — Documentation Index

Working codename: **Vesalia** (trademark clearance pending; every user-facing string reads the
name from tenant config so the brand can change without a code change).

This folder is the planning output required before implementation (Phases A–J). Each document
states, for every recommendation: why it was chosen, alternatives considered, trade-offs, risks,
and scalability implications. Decisions that cut across documents are recorded once in
`adr/` and referenced by number (ADR-001 …).

| Phase | Document | Status |
|---|---|---|
| A | [01 Executive Product Vision](phase-a/01-executive-vision.md) | v1 |
| A | [02 Product Requirements Document](phase-a/02-prd.md) | v1 |
| A | [03 Market Analysis](phase-a/03-market-analysis.md) | v1 |
| A | [04 Competitor Analysis](phase-a/04-competitor-analysis.md) | v1 |
| A | [05 Licensing Audit](phase-a/05-licensing-audit.md) | v1 — **gates content decisions** |
| A | [06 User Personas](phase-a/06-personas.md) | v1 |
| A | [07 User Journeys](phase-a/07-user-journeys.md) | v1 |
| A | [08 Revenue Model](phase-a/08-revenue-model.md) | v1 |
| A | [09 SaaS Business Model](phase-a/09-saas-business-model.md) | v1 |
| A | [10 White-Label Strategy](phase-a/10-white-label-strategy.md) | v1 |
| A | [11 Go-To-Market Plan](phase-a/11-go-to-market.md) | v1 |
| B | [Educational Architecture](phase-b/educational-architecture.md) | v1 |
| C | [Technical Architecture](phase-c/technical-architecture.md) | v1 |
| D | [Database Schema](phase-d/database-schema.md) → `prisma/schema.prisma` | v1 |
| E | [Knowledge Schema](phase-e/knowledge-schema.md) → `src/knowledge/schema.ts` | v1 |
| F | [UI/UX Specification](phase-f/ux-specification.md) | v1 |
| G | [Rendering Architecture](phase-g/rendering-architecture.md) | v1 |
| H | [Implementation Roadmap](phase-h/roadmap.md) | v1 |
| I | [Sprint-by-Sprint Plan](phase-i/sprint-plan.md) | v1 |
| J | [Code Generation Strategy](phase-j/code-generation-strategy.md) | v1 |
| — | [Architecture Decision Records](adr/README.md) | living |

## How to read this

1. Start with the vision and PRD (A-01, A-02) for scope.
2. Read the licensing audit (A-05) before touching any content or asset pipeline.
3. B → G are the design; H → J are the plan.
4. The code under `digital-human/` is the Sprint 0–3 output of Phase I and is documented in
   the root `README.md`.

## Non-negotiables carried through every phase

- **No hallucinated medical content.** Every knowledge field is either citation-backed or
  empty. Empty is acceptable; wrong is not. Faculty review gates publication (Phase E).
- **Commercial-clean content only.** Sources with NonCommercial or NoDerivatives terms are
  excluded from the product (Phase A-05).
- **Mid-range Android is the primary render target.** Desktop is a superset (Phase G).
- **Multi-tenant from day one.** Every row that belongs to an institution carries `tenantId`
  and is protected by Postgres row-level security (Phase D).
