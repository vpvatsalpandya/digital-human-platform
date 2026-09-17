# A-04 · Competitor Analysis

## 1. Direct competitors

| | Complete Anatomy (Elsevier/3D4Medical) | Visible Body (Argosy) | BioDigital Human | Anatomy.app / Kenhub / Others |
|---|---|---|---|---|
| Model quality | Best-in-class, custom, male & female, microanatomy | Very good, textbook-aligned | Good; strong disease/condition library | Variable |
| Platform | Native iOS/macOS/Windows/Android, heavy downloads (GBs) | Web + native; lighter | Web (WebGL), SDK/API for embedding | Web/native |
| Mobile low-end | Weak (storage, RAM) | Moderate | Moderate (WebGL, no offline) | Varies |
| Content depth | Deep gross anatomy; physiology animations; radiology (limited); no histology depth | Physiology & A&P course integration | Conditions, patient education | Quizzes and text |
| Assessment | Quizzes, screens; LMS via Elsevier | Quizzes, flashcards, LMS | Basic | Quizzes |
| Faculty authoring | Curriculum manager; lecture builder | Courseware | Limited | Limited |
| Multi-tenant / white-label | No white-label | No | Yes (SDK, embedded, branded) | No |
| AI tutor | Emerging (Elsevier) | No | No | Kenhub has text explanations |
| Institution pricing (public) | Site licence, per-FTE tiers | Per-FTE | Enterprise | Per-seat |
| Regulatory footprint | Strong (Elsevier brand) | Strong in US ed | Strong in patient ed | Weak |

## 2. Where they are strong and we do not compete on it
- **Model fidelity.** Complete Anatomy's mesh set is a decade of investment. We will not out-
  model them in v1; we ship "good enough, fast everywhere" and improve the model set with
  revenue (A-05 §6).
- **Brand.** Elsevier bundles with textbooks. We answer with institution-led content and price.

## 3. Where we win

| Dimension | Incumbent gap | Our answer |
|---|---|---|
| Mid-range Android | Multi-GB native apps; no low-bandwidth mode | PWA, streamed LOD assets, ≤ 8 MB per system, offline cache |
| Integrated modules at structure level | Histology, embryology, radiology are separate products or shallow | One structure ID links atlas ↔ slide ↔ stage ↔ slice ↔ simulation |
| Assessment as first-class | Add-on quizzes | Spotter, OSPE, OSCE, viva with examiner apps and item analysis |
| Faculty workflow | Curriculum managers bolted on | Authoring, review, cohort analytics in the same product |
| Content trust | "Trust us" | Citations on every field; visible review status; faculty can flag |
| White-label multi-tenancy | Only BioDigital, and only as SDK | Full tenant branding, domains, SSO, LTI |
| Regional curricula | US/UK-centric | NMC CBME competency codes mapped to structures and items; extensible to other frameworks |
| Price | USD 30–75 per seat per year | USD 3–8 per seat per year at institution scale in India; tiered globally |
| Real simulations | Animations | Runnable physiological models with adjustable parameters and exposed equations |

## 4. Indirect competitors
- YouTube, Kenhub, Osmosis, Lecturio, Marrow/PrepLadder (India exam prep): content depth and
  question banks; no 3D. Partnership candidates for the B2C channel.
- Cadaver labs and plastinated models: complementary; we integrate (spotter mode can use lab
  photos as stations).
- LMS vendors (Moodle, Canvas, Blackboard): integration targets, not competitors.

## 5. Defensibility
1. Reviewed knowledge graph with provenance — expensive to replicate, compounding.
2. Institutional data (assessment outcomes, benchmarking) — network effect across tenants.
3. Mobile rendering pipeline tuned for constrained devices.
4. Partner-owned content (histology, radiology) tied to co-ownership contracts.

## 6. Anticipated responses and counters
- Incumbent price cuts in India → department-level entry pricing; multi-year locks; exam
  integration they lack.
- Incumbent lightweight mobile app → our lead is the integrated workflow, not just size.
- New open-source viewer (e.g., Z-Anatomy web) → we contribute upstream to the open asset
  pack; the platform value is above the viewer.
