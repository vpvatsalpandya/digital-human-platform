# A-01 · Executive Product Vision

## One sentence

A mobile-first digital human that every health-sciences learner in the world can open on a
₹12,000 Android phone, in which every structure is explorable in 3D, explained with cited,
faculty-approved content, connected to its histology, embryology, physiology, pathology and
imaging, and examinable — sold to institutions as a white-label SaaS.

## Why this, why now

1. **Anatomy education is still built around the cadaver-plus-textbook model**, which scales
   badly: cadaver supply is constrained in India and much of Asia and Africa, dissection hours
   are shrinking in reformed curricula (NMC CBME in India, integrated curricula in the UK/US),
   and practical examinations (spotters, OSPE, viva) are labour-intensive to run.
2. **Incumbents are desktop-era products retrofitted for mobile.** Complete Anatomy, Visible
   Body and BioDigital have excellent models and weak institutional workflows: assessment,
   faculty authoring, analytics and LMS integration are add-ons, not the core. None is
   designed for a 4 GB RAM Android phone on a 4G connection.
3. **Open data has crossed a quality threshold.** BodyParts3D/Z-Anatomy (full male body,
   CC BY-SA), the HuBMAP Human Reference Atlas (male and female organs, CC BY 4.0), the Open
   Anatomy Project atlases (Slicer licence, commercial OK), TotalSegmentator (1,228 CTs with
   117 labelled structures, CC BY 4.0) and OpenStax A&P 2e (CC BY 4.0 text) make it possible to
   ship a credible, legally clean version 1 without commissioning a full model set first.
4. **LLM tutoring is finally usable when constrained.** Retrieval-augmented generation over a
   curated, cited knowledge base lets us offer a tutor that refuses to invent anatomy.

## What we are building (and not)

| We are | We are not |
|---|---|
| A learning *system*: atlas + knowledge + simulations + assessment + analytics | A 3D model viewer with a price tag |
| Institution-first (licensed to universities, departments, hospitals) with a direct-to-student channel for exam prep | A consumer app that hopes universities notice |
| Mobile-first, low-bandwidth, offline-capable | Desktop-first with a mobile port |
| Citation-backed and faculty-reviewed | AI-generated content at scale |
| White-label and multi-tenant from the first commit | A single-brand product with tenancy bolted on |

## Product pillars

1. **Digital Human Engine** — male and female bodies, 14 systems, isolate/hide/fade/explode/
   clip/compare, structure search, saved views and bookmarks. (Phase G)
2. **Knowledge Engine** — one structured, cited record per structure, with a review workflow
   and provenance on every field. (Phase E)
3. **Integrated Modules** — physiology simulations (real ODE models, not videos), virtual
   microscope, embryology timeline, pathology comparison, radiology synchronised to 3D.
4. **Assessment** — spotter, practical, viva, quiz, OSPE, OSCE; faculty-authored; auto-scored
   where the answer is objective.
5. **AI Tutor** — RAG-only, mode-aware (school → postgraduate), citation-enforced.
6. **Institution Layer** — faculty portal, analytics for three audiences, LMS integration,
   SSO, branding, subscription management.

## Strategic bets (each is an ADR)

- **ADR-001 Open assets first, commissioned assets second.** Ship on CC BY / CC BY-SA models;
  commission a proprietary model set once revenue justifies it. Trade-off: ShareAlike models
  must stay public; the platform, content and pedagogy are the moat, not the meshes.
- **ADR-002 Institution-led content partnerships.** Histology slides, radiology cases and
  regional clinical correlations come from partner colleges under a co-ownership agreement.
  This solves the "NonCommercial licence" problem for histology and gives partners a reason
  to adopt.
- **ADR-003 One codebase, three surfaces.** PWA on mobile, responsive web on desktop,
  Capacitor wrapper only if app-store presence is a procurement requirement.
- **ADR-004 Next.js monolith with module boundaries.** A modular monolith beats microservices
  for a team of 5–15; the boundaries exist so extraction is possible later.

## Success metrics (36 months)

| Metric | Month 12 | Month 24 | Month 36 |
|---|---|---|---|
| Paying institutions | 15 | 80 | 250 |
| Active learners | 20,000 | 150,000 | 600,000 |
| ARR (USD) | 0.4M | 2.5M | 9M |
| Structures with faculty-approved records | 800 | 2,500 | 5,000 |
| Median first-render time on mid-range Android (4G) | < 4 s | < 3 s | < 2.5 s |
| Institutional renewal rate | — | > 85% | > 90% |

## Risks we accept knowingly

- Anatomy content review is slow and expensive; we budget for it explicitly (Phase H).
- Incumbents can cut price; our defence is workflow depth and mobile performance, not price.
- CC BY-SA meshes cannot be made proprietary; we treat this as a marketing asset ("open
  atlas, premium platform") and plan the replacement set (A-05 §6).
