# A-02 · Product Requirements Document

Version 1.0 · Owner: CPO · Status: baseline for Phases B–J

## 1. Problem statement

Health-sciences learners need to build a three-dimensional mental model of the human body and
connect it to function, tissue, development, disease and imaging. Existing tools optimise for
visual fidelity on high-end devices and treat institutions as billing entities rather than
users. Faculty need to author, assess and monitor; administrators need benchmarking and
compliance; students need something that works on the phone they already own.

## 2. Goals and non-goals

**Goals**
- G1 Deliver a complete 3D atlas (male + female, 14 systems) usable on mid-range Android.
- G2 Attach a cited, reviewed knowledge record to every structure.
- G3 Integrate physiology, histology, embryology, pathology and radiology at the structure level.
- G4 Provide six assessment modes with faculty authoring and automated scoring.
- G5 Provide a RAG-only AI tutor with audience modes.
- G6 Provide faculty, student and administrator dashboards.
- G7 Be multi-tenant, white-label, and deployable to Vercel, AWS and Kubernetes.

**Non-goals (v1)**
- VR/AR headsets (architecture leaves room; not in scope).
- Surgical simulation with haptics.
- Clinical/diagnostic use of any kind (explicitly disclaimed).
- Veterinary anatomy.

## 3. Audiences and modes

The platform has one body of content with **audience modes** that change depth, vocabulary and
assessment style. Modes: `school`, `neet`, `nursing`, `pharmacy`, `physiotherapy`, `allied`,
`mbbs`, `dental`, `postgraduate`, `faculty`. Every knowledge field can carry mode-specific
variants (Phase E) and every assessment item carries a target mode.

## 4. Functional requirements

Requirements are tagged `[M]` must, `[S]` should, `[C]` could for v1 (first 12 months).

### 4.1 Digital Human Engine
- FR-E1 `[M]` Load male or female body; switch preserves camera and selection where the
  structure exists in both.
- FR-E2 `[M]` Systems: skeletal, muscular, nervous, endocrine, cardiovascular, respiratory,
  digestive, urinary, reproductive, lymphatic, integumentary, connective tissue, fascial
  layers, surface anatomy. Each system togglable independently.
- FR-E3 `[M]` Search structures by name, alternative name, Latin name, FMA ID; results ranked
  with prefix and fuzzy matching; sub-100 ms on device (client-side index).
- FR-E4 `[M]` Select → isolate, hide, fade (opacity 0.15), reset. Multi-select with long-press.
- FR-E5 `[M]` Explode view per system and per region with a slider.
- FR-E6 `[M]` Global and per-system transparency.
- FR-E7 `[M]` Clipping planes: axial, coronal, sagittal, and free; draggable; cap rendering.
- FR-E8 `[S]` Compare mode: two systems or two states side-by-side or overlaid.
- FR-E9 `[M]` Save views (camera, visibility, clip, explode, annotations) with a name;
  shareable by link inside the tenant.
- FR-E10 `[M]` Bookmark structures; bookmarks sync across devices.
- FR-E11 `[M]` Touch: one-finger orbit, two-finger pan/zoom, tap select, long-press context.
- FR-E12 `[M]` Progressive loading: skeleton first, then requested systems; visible progress.
- FR-E13 `[S]` Offline: previously loaded systems and records available without network.
- FR-E14 `[S]` Low-bandwidth mode: lowest LOD only, textures off, defer non-visible systems.

### 4.2 Knowledge Engine
- FR-K1 `[M]` Every structure has a record with the 20 required fields (Phase E schema).
- FR-K2 `[M]` Every non-empty field carries at least one citation; a field without citation
  cannot be published.
- FR-K3 `[M]` Review workflow: draft → in-review → changes-requested → approved → published →
  deprecated, with reviewer identity and timestamps.
- FR-K4 `[M]` Records versioned; published version is immutable; diffs viewable.
- FR-K5 `[S]` Tenant overlays: an institution can add local notes and clinical cases to a
  record without forking the global record.
- FR-K6 `[M]` Canonical identifiers: FMA ID primary, UBERON and TA2 cross-references,
  SNOMED CT optional and tenant-gated.

### 4.3 Physiology
- FR-P1 `[M]` Cardiac cycle: time-varying elastance model with Wiggers diagram, PV loop and
  synthetic ECG, adjustable HR, contractility, preload, afterload.
- FR-P2 `[M]` Action potential: Hodgkin–Huxley model with stimulus control and channel toggles.
- FR-P3 `[S]` Respiratory mechanics and gas exchange; nephron; synaptic transmission;
  hormonal pathways (state-machine simulations).
- FR-P4 `[M]` Every simulation exposes its equations and citations in a "How this works" panel.

### 4.4 Histology
- FR-H1 `[M]` Deep-zoom viewer (tile pyramid), pinch zoom, pan, minimap, scale bar.
- FR-H2 `[M]` Annotation layers: faculty annotations, student notes, exam overlays.
- FR-H3 `[M]` Modes: guided (step-through hotspots), self-study, assessment (identify region).
- FR-H4 `[M]` Normal and pathological slides, linked to the structure record.

### 4.5 Embryology
- FR-Em1 `[M]` Timeline: fertilisation → implantation → gastrulation → organogenesis → fetal
  period; week-by-week and Carnegie stage navigation.
- FR-Em2 `[S]` 3D stage models where licensed assets exist; 2D illustrated where not.
- FR-Em3 `[S]` Congenital anomaly branches attached to the stage where the error occurs.

### 4.6 Pathology
- FR-Pa1 `[M]` Side-by-side and swipe comparison of normal vs disease (3D or slide).
- FR-Pa2 `[S]` Pathology overlays on the 3D model (texture/material swap and lesion meshes).

### 4.7 Radiology
- FR-R1 `[M]` Slice viewer: axial/coronal/sagittal, window/level, scroll, landmark labels.
- FR-R2 `[M]` Selecting a structure in 3D jumps to the slice and highlights the label mask.
- FR-R3 `[S]` X-ray and ultrasound cases with annotated landmarks.
- FR-R4 `[C]` DICOM upload by faculty (de-identified) via Cornerstone3D.

### 4.8 Assessment
- FR-A1 `[M]` Spotter: timed stations with pinned structures on 3D/slide/image.
- FR-A2 `[M]` Practical: task list with rubric.
- FR-A3 `[M]` Viva: structured question bank with examiner scoring; optional AI-practice mode.
- FR-A4 `[M]` Quiz: MCQ, multi-select, image-hotspot, drag-label, short answer.
- FR-A5 `[M]` OSPE/OSCE: station templates, checklists, examiner apps, aggregate scoring.
- FR-A6 `[M]` Faculty authoring with item banks, tagging by mode/system/structure, and
  psychometric summaries (difficulty, discrimination).

### 4.9 AI Tutor
- FR-T1 `[M]` Answers only from retrieved, published knowledge; every claim cites a record.
- FR-T2 `[M]` If retrieval confidence is below threshold, the tutor says so and offers the
  nearest records instead of answering.
- FR-T3 `[M]` Mode-aware register and depth.
- FR-T4 `[S]` Context-sensitive: knows the current structure, view, slide or simulation.
- FR-T5 `[M]` Conversation logs retained per tenant policy; PII never sent to the model.

### 4.10 Faculty portal, analytics, tenancy
- FR-F1 `[M]` Create lessons (sequenced views + records + media), practical demos, quizzes,
  assignments, spotters, viva sessions; publish to cohorts.
- FR-F2 `[M]` Monitor performance per learner, cohort, system, structure.
- FR-An1 `[M]` Student dashboard: progress, weak areas, time, mastery per system.
- FR-An2 `[M]` Faculty dashboard: cohort mastery heatmap, item analysis.
- FR-An3 `[M]` Admin dashboard: usage, seat utilisation, benchmarking across departments
  (and, opt-in, across institutions, anonymised).
- FR-Te1 `[M]` Tenants with departments, roles (student, faculty, examiner, admin, owner),
  plans, seats, branding, custom domain, SSO (SAML/OIDC), LTI 1.3.

## 5. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | First meaningful 3D render ≤ 4 s on a Snapdragon 6-series class device over 4G; ≥ 30 fps sustained with skeletal + one system visible at LOD1 |
| Bundle | Initial JS ≤ 250 kB gzipped for the atlas route; engine code split |
| Assets | Any single system ≤ 8 MB at LOD1 (Draco/meshopt + KTX2); full body LOD0 streamed on demand |
| Availability | 99.9% monthly for the SaaS tier; RPO 15 min, RTO 1 h |
| Security | OWASP ASVS L2; tenant isolation by RLS; SOC 2 Type II readiness by month 18 |
| Privacy | DPDP Act (India), GDPR, FERPA-compatible processing; data residency per region |
| Accessibility | WCAG 2.2 AA for all non-3D UI; 3D has keyboard navigation and text alternatives |
| Localisation | UI i18n; content i18n per field (Phase E); RTL supported |
| Observability | OpenTelemetry traces, structured logs, RUM for render timings |

## 6. Constraints
Frontend: React, TypeScript, React Three Fiber, Three.js, Zustand, Tailwind. Backend: Next.js,
PostgreSQL, Prisma, Redis. Deployment: Docker, Kubernetes, Vercel, AWS, CDN. (Given; see
Phase C for how each is used and where we add to them.)

## 7. Release criteria for v1
- All `[M]` requirements shipped and verified on the device matrix (Phase G §9).
- ≥ 800 published records, each with ≥ 1 citation per non-empty field, reviewed by at least one
  faculty reviewer with anatomy credentials.
- Security review passed; penetration test with no open high findings.
- Three pilot institutions live with SSO and at least one real assessment run.
