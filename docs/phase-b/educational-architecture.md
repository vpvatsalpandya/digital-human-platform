# Phase B · Educational Architecture

## 1. Design principle: one knowledge graph, many audience lenses

The platform stores a **single canonical body of content** (structures, records, slides,
cases, simulations, assessment items) and projects it through **audience modes**. This avoids
maintaining ten parallel curricula, keeps review effort linear, and lets a learner move from
school to nursing to MBBS without losing progress.

Why: the alternative (separate content per audience) triples authoring and review cost and
drifts. Trade-off: mode-specific variants must be first-class fields, not afterthoughts
(Phase E §3). Risk: a mode leaking postgraduate depth to school students — mitigated by
mode-gated field visibility and reviewer checks per mode.

## 2. Audience modes

| Mode | Vocabulary | Depth | Emphasis | Assessment style |
|---|---|---|---|---|
| school | Plain English, NCERT-aligned | Organ and system level | Structure–function | MCQ, label-the-diagram |
| neet | NCERT terminology | System + key structures | Physiology facts, diagrams | Timed MCQ |
| nursing | Clinical English | Regional anatomy for procedures | Surface anatomy, landmarks, procedures | Spotter, OSCE checklist |
| pharmacy | Pharmacological | Physiology, receptors, organ targets | Drug–target physiology | MCQ, short answer |
| physiotherapy | Musculoskeletal | Detailed MSK, innervation, biomechanics | Muscles, joints, nerves | Spotter, practical |
| allied | Clinical English | Regional | Imaging landmarks (radiography), lab correlates | Spotter, quiz |
| mbbs | Terminologia Anatomica | Full gross, histology, embryology, applied | Relations, blood supply, clinical | Spotter, viva, OSPE |
| dental | TA, dental terminology | Head and neck in depth | Oral, TMJ, cranial nerves | Spotter, viva |
| postgraduate | TA + specialty | Surgical, radiological, variations | Surgical relevance, imaging | Viva, case-based |
| faculty | All | All | Authoring and review | — |

Mode determines: default visible knowledge fields, vocabulary preference (TA vs common),
default assessment templates, tutor register, and dashboard competency framework.

## 3. Competency frameworks

Curriculum frameworks are data, not code: `CurriculumFramework` → `Competency` (code, text,
level) → mappings to structures, records, simulations, slides and assessment items. Seeded
frameworks: NMC CBME Anatomy (AN1.1–AN80.x), Physiology (PY), Pathology (PA); NCERT class
11–12 biology chapter map; Indian Nursing Council BSc Nursing anatomy/physiology outline.
Tenants add their own. Analytics roll up by competency.

## 4. Learning model

- **Learning objects** (LO): structure view, record, slide, stage, case, simulation, item.
- **Lessons**: ordered LOs with narrative, authored by faculty or curated by us; a lesson step
  is a saved view + a record tab + an optional check question.
- **Pathways**: sequences of lessons per mode and competency; adaptive branching by mastery.
- **Mastery** per structure and competency is estimated by a Bayesian Knowledge Tracing
  variant updated by assessment item responses and spaced-retrieval quizzes. Why BKT over
  IRT-only: works with sparse data per learner; IRT is used at item level for difficulty and
  discrimination once ≥ 200 responses exist.
- **Spaced retrieval**: daily 5-minute quiz drawn from low-mastery structures (SM-2 style
  scheduling). Optional; default on for exam-prep modes.

## 5. Module pedagogy

### 5.1 Gross and surface anatomy (Digital Human Engine)
Guided sequences per region: skeleton → joints → muscles by compartment → vessels → nerves →
viscera → surface projection. "Relations" are taught by isolate-with-neighbours. Surface
anatomy is a dedicated layer with palpable landmarks and dermatomes projected on skin.

### 5.2 Physiology
Simulations are runnable models with sliders and exposed equations. Pedagogical rules:
predict-observe-explain (student predicts, then runs), one variable at a time, and a
"what happened" summary tied to record fields. Models (v1): cardiac time-varying elastance +
Windkessel; Hodgkin–Huxley action potential; alveolar gas exchange (two-compartment);
nephron countercurrent (discrete stages); synaptic transmission (state machine);
endocrine axes (feedback state machines). Each model has a citation set and a validation
note comparing outputs to textbook ranges.

### 5.3 Histology
Virtual microscope with three modes: guided (hotspot tour), self-study (free with labels
toggle), assessment (identify region/structure/tissue). Slides are linked to the structures
they section. Normal → pathological pairs where both exist.

### 5.4 Embryology
Timeline with two axes: **weeks post-fertilisation** and **Carnegie stages**. Each node has
events, derivatives, and anomaly branches ("if neural tube fails to close here → …"). 3D
where assets exist; illustrated otherwise. Lineage view: germ layer → derivative organ →
adult structure (links back into the atlas).

### 5.5 Pathology
Comparison pairs (normal vs disease) with swipe/side-by-side; overlays on the atlas (material
swap and lesion meshes). Every pair links to gross and microscopic views and the clinical
correlation field.

### 5.6 Radiology
Cross-sectional learning by scrolling with synchronised 3D highlight; modality tabs
(X-ray, CT, MRI, ultrasound). Landmark identification exercises feed the assessment engine.

### 5.7 Clinical correlations
Every record carries clinical significance, surgical relevance, common diseases, and
examination pearls; cases (tenant or global) are linked to structures and competencies.

## 6. Assessment architecture

| Mode | Item types | Scoring | Setting |
|---|---|---|---|
| Spotter | Pinned structure on 3D/slide/image; typed or select answer | Automated; synonym-aware; partial credit configurable | Timed stations, randomised |
| Practical | Task checklist with rubric | Examiner (mobile app) | Lab |
| Viva | Structured question sets, model answers, difficulty ladder | Examiner rubric; AI practice mode gives feedback from record only | Live or practice |
| Quiz | MCQ, multi-select, hotspot, drag-label, short answer, ordering | Automated; short answer via keyword rubric + optional AI-assisted grading flagged for review | Self-paced or scheduled |
| OSPE | Station templates (observed + unobserved) with checklists | Examiner + automated for unobserved | Multi-station rotation |
| OSCE | Clinical stations, simulated patient scripts, checklists, global rating | Examiner | Multi-station rotation |

Psychometrics: per-item difficulty (p-value), discrimination (point-biserial), distractor
analysis; flagged items go to a faculty review queue. Blueprinting: faculty specify
competency coverage and the engine reports gaps before publishing.

## 7. Faculty review workflow for content

States: `draft → in_review → changes_requested → approved → published → deprecated`.
Rules: at least one reviewer with an anatomy/physiology/pathology credential per record
domain; the author cannot approve their own record; every non-empty field must have ≥ 1
citation; publishing creates an immutable version; learner-facing "Report an error" creates a
review task with SLA (Pro 10 business days, Enterprise 5). Reviewer UI shows source excerpts
inline (Phase E §5).

## 8. AI tutor pedagogy
Retrieval-only. Modes set the register. The tutor is allowed to: explain a retrieved record,
compare two retrieved records, quiz the learner using existing items, and point to where in
the atlas to look. It is not allowed to: state facts without a retrieved citation, diagnose,
or discuss clinical management beyond record content. If retrieval returns nothing above
threshold, the tutor says it cannot answer from the reviewed knowledge base and suggests the
nearest records. Every response carries citations rendered as chips; clicking opens the
record at the field.

## 9. Accessibility and inclusion in pedagogy
Text alternatives for every 3D state (auto-generated description: "Anterior view; right
biceps brachii isolated; neighbours faded"); keyboard-navigable structure tree; colour-blind
safe system palettes; dyslexia-friendly font option; captions for any audio.

## 10. Alternatives considered
- **Video-first content** (Osmosis-style): cheaper to produce, weaker for spatial learning;
  rejected as core, allowed as faculty-uploaded supplementary media.
- **Fully adaptive AI-generated pathways**: rejected until the knowledge base is dense enough;
  adaptivity is rules + BKT in v1.
- **Separate exam product**: rejected; assessment inside the same graph is the differentiator.
