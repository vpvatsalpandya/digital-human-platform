# Phase H · Implementation Roadmap

## 0. Team (Y1)
Engineering 8 (2 engine/graphics, 3 full-stack, 1 data/asset pipeline, 1 mobile/perf, 1 QA/
automation), content 6 (1 lead anatomist, 2 authors, 2 reviewers part-time faculty, 1 medical
illustrator), product 2 (CPO, designer), GTM 3.

## 1. Milestones

| Month | Milestone | Exit criteria |
|---|---|---|
| 0–1 | M0 Foundations | Repo, CI, multi-tenant schema, auth, tenant theming, engine skeleton rendering open pack LOD2 on a mid-range Android |
| 2–3 | M1 Atlas alpha | Male body 14 systems, search/isolate/hide/fade/explode/clip/save/bookmark; 200 records seeded from OpenStax, review workflow live |
| 4–5 | M2 Modules alpha | Cardiac + action-potential simulations; histology viewer with 60 partner slides; radiology slice viewer with 10 TotalSegmentator cases synced to 3D; embryology timeline v1 (illustrated) |
| 6 | M3 Assessment + design partners live | Spotter, quiz, viva; faculty authoring; 3 design partners onboarded; first real spotter run |
| 7–8 | M4 Tutor + analytics | RAG tutor with citations; student/faculty dashboards; 800 published records |
| 9–10 | M5 Female body + pathology | HRA-based female organs + adapted skeleton; pathology pairs and overlays; OSPE/OSCE |
| 11–12 | M6 v1 GA | LTI 1.3, SAML, admin dashboards, billing, offline exam runner, SOC 2 readiness, pen test; 15 paying institutions |
| 13–18 | v1.x | Commissioned embryology set; localisation (AR, ID, FR, PT); resellers; WebGPU flag on desktop |
| 19–24 | v2 | Commissioned male/female model set; benchmarking; marketplace pilot; EU residency |

## 2. Workstreams and dependencies

```
Asset pipeline ──▶ Engine ──▶ Atlas UX ──▶ Assessment (3D items) ──▶ Analytics
Knowledge schema ──▶ Authoring/review ──▶ Records ──▶ Tutor (RAG)
Tenancy/auth ──▶ Faculty portal ──▶ Admin ──▶ Billing/LTI/SSO
Partner content ──▶ Histology/Radiology/Pathology modules
```
Critical path: asset pipeline → engine performance on low tier (everything else can be
faked; this cannot).

## 3. Content plan (records)
- Months 0–3: 200 records (OpenStax seed; MBBS-depth review) covering high-yield regions
  (upper limb, thorax, abdomen).
- Months 4–8: 800 (all regions, all required fields for top structures).
- Months 9–12: 1,200; months 13–24: 2,500 with mode variants.
- Throughput assumption: author 6 records/day at MBBS depth; reviewer 15/day; two-thirds of
  time goes to citations and relations.

## 4. Risk register (top)
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Low-tier performance misses budget | Med | High | Governor, LOD, weekly device lab from month 1 |
| Content review bottleneck | High | High | Reviewer pool contracts; queue metrics; OpenStax seed |
| Partner slide throughput | Med | Med | Two scanning partners; buy a used scanner |
| SA licence containment error | Low | High | Legal review gate before GA; asset manifests |
| AI tutor hallucination incident | Low | High | RAG-only, validator, refusal path, red-team set |
| Procurement delays | High | Med | Department-level entry pricing; pilots |

## 5. Budget (Y1, USD) — see A-11 §8. Content is 20%; do not cut it.
