# A-05 · Licensing Audit of Open-Source Anatomy Assets, Data and Software

Audit date: September 2026. Verified against the sources listed at the end. Licence terms
change; every asset in the pipeline records its licence and retrieval date in
`content/manifests/*.json` (Phase E §7) and the audit is re-run each quarter.

Rule applied throughout: **a source is usable only if its licence permits commercial use and
redistribution of derivatives.** NonCommercial (NC) and NoDerivatives (ND) sources are
excluded from the product entirely, including from "internal" use, because a white-label
platform sold to institutions is unambiguously commercial.

## 1. Summary table

| # | Candidate | Type | Licence | Commercial | Derivatives | Verdict |
|---|---|---|---|---|---|---|
| 1 | BodyParts3D / Anatomography (DBCLS, Japan) | 3D meshes, male, ~2,000 structures, FMA-labelled | CC BY-SA 2.1 JP | Yes | Yes, ShareAlike | **In use** — skeleton, muscles, stomach, adrenals in `hra-v1` |
| 2 | Z-Anatomy (Kervyn, Zielinski et al.) | Retopologised BodyParts3D + additions, Blender, 5,000+ objects | CC BY-SA 4.0 | Yes | Yes, ShareAlike | **In use** in the `anatomy-v2` detail pack, minus excluded NC parts (inner ear, kidney, unverified brain internals); see `docs/anatomy-v2-pipeline.md` |
| 3 | HuBMAP Human Reference Atlas 3D Reference Object Library | GLB organs, male and female, expert-approved | CC BY 4.0 | Yes | Yes | **In use** — ships as the `hra-v1` pack for both bodies |
| 4 | Open Anatomy Project (SPL brain, abdomen, knee, head & neck, inner ear atlases) | Labelled meshes + source MRI/CT | 3D Slicer licence (BSD-style) | Yes | Yes | **Use** (regional atlases, radiology alignment) |
| 5 | Visible Human Project (NLM) | Cryosection images, CT, MRI, male and female | NLM terms & conditions (no licence since 2019) | Yes | Yes | **Use** (cross-section and radiology base) |
| 6 | TotalSegmentator CT dataset | 1,228 CTs, 117 labelled structures | CC BY 4.0 (data), Apache 2.0 (tool) | Yes | Yes | **Use** (radiology module; segmentation tool for new cases) |
| 7 | The Cancer Imaging Archive (TCIA) | DICOM collections | Mostly CC BY 3.0/4.0; some controlled | Yes (per collection) | Yes | **Use with per-collection check** |
| 8 | OpenStax Anatomy & Physiology 2e | Textbook, figures | CC BY 4.0 | Yes | Yes | **Use** (seed text, figures, embryology chapter) |
| 9 | Foundational Model of Anatomy (FMA) | Ontology, 75k classes | CC BY 3.0 | Yes | Yes | **Use** (canonical ID) |
| 10 | UBERON | Cross-species ontology | CC BY 3.0 | Yes | Yes | **Use** (cross-reference) |
| 11 | Terminologia Anatomica 2 (FIPAT) | Terminology | Verify: published online under CC BY-ND terms; facts/terms themselves not copyrightable | Yes for terms | ND on the document | **Use term lists; do not reproduce the document** |
| 12 | SNOMED CT | Clinical terminology | Affiliate licence; free in Member countries (India is a Member); fees in non-Member territories | Conditional | — | **Optional, tenant-gated**; not a core dependency |
| 13 | Wikipedia / Wikimedia Commons | Text, images | CC BY-SA 3.0/4.0 (text), per-file (images) | Yes | Yes, ShareAlike | **Images: per-file check. Text: do not copy** (ShareAlike would infect our knowledge base) |
| 14 | Michigan Histology virtual slides | Whole-slide images | CC BY-NC-SA 4.0 | **No** | — | **Exclude** |
| 15 | Radiopaedia | Cases, images | CC BY-NC-SA 3.0 | **No** | — | **Exclude** |
| 16 | 3D Atlas of Human Embryology (Amsterdam, de Bakker et al.) | 3D PDF embryo models, CS7–23 | CC BY-NC-ND 4.0 | **No** | **No** | **Exclude** |
| 17 | Virtual Human Embryo (EHD/LSUHSC) | Serial sections, models | All rights reserved | **No** | — | **Exclude** (approach for a licence deal only if needed) |
| 18 | NIH 3D (formerly 3D Print Exchange) | Models | Per-model CC licence (BY, BY-SA, BY-NC…) or public domain | Per model | Per model | **Use only models tagged CC BY, CC BY-SA, CC0/public domain** |
| 19 | Human-Atlas (slorksmo, GitHub) | React + Three.js viewer over BodyParts3D + HRA | MIT (code), CC BY (data) | Yes | Yes | **Reference only** (small project, 7 commits; useful as a data-pipeline precedent, not as a dependency) |
| 20 | Open Anatomy Browser (OABrowser) | Web viewer | Slicer licence | Yes | Yes | **Reference only** (AngularJS-era; not adopted) |
| 21 | Three.js, React Three Fiber, drei, three-mesh-bvh, meshoptimizer, Draco, KTX2/Basis | Software | MIT / Apache 2.0 | Yes | Yes | **Use** |
| 22 | OpenSeadragon | Deep-zoom viewer | BSD-3 | Yes | Yes | **Use** (histology; or our own tile viewer, see Phase C) |
| 23 | Cornerstone3D, dicomParser | DICOM rendering | MIT | Yes | Yes | **Use** (radiology, faculty DICOM upload) |
| 24 | Next.js, Prisma, Zustand, Tailwind, BullMQ, ioredis | Software | MIT / Apache 2.0 | Yes | Yes | **Use** |

## 2. Per-candidate analysis

### 2.1 BodyParts3D / Anatomography
- **Architecture/quality.** OBJ meshes segmented from a single male MRI; each part mapped to an
  FMA ID. Topology is noisy (MRI-derived), vessels and nerves are tubes, no textures.
- **Scalability.** Static assets; fine. Needs decimation and LOD generation (Phase G).
- **Commercial viability.** CC BY-SA 2.1 JP permits commercial use. ShareAlike applies to
  *adaptations* (our cleaned/decimated meshes) which must be released under a compatible
  licence. It does not apply to the software that displays them or to independent knowledge
  content (a "collection", not an adaptation). Legal note: CC BY-SA 2.1 JP is an old,
  jurisdiction-ported licence; upgrading derivatives to CC BY-SA 4.0 is permitted by the
  4.0 compatibility mechanism only in one direction, so we release derivatives as
  **CC BY-SA 4.0 with the BodyParts3D notice preserved**, as Z-Anatomy does.
- **Maintenance.** Last data release 2011–2013; DBCLS keeps the archive online. Effectively
  frozen, which is acceptable for reference anatomy.
- **Attribution required.** "BodyParts3D, © The Database Center for Life Science licensed
  under CC Attribution-Share Alike 2.1 Japan".

### 2.2 Z-Anatomy
- **Architecture/quality.** Blender project with retopologised BodyParts3D meshes, added
  structures (from contributing universities), curves for vessels/nerves, materials, 3,500+
  definitions (definitions are Wikipedia-derived, CC BY-SA 3.0 — **we do not import the
  definitions**, only the meshes and labels).
- **Scalability.** Export pipeline needed (Blender → glTF → gltfpack); documented in Phase G.
- **Commercial viability.** CC BY-SA 4.0: commercial OK; our mesh derivatives stay CC BY-SA.
- **Maintenance.** Active community, 300+ commits; the founder maintains a web viewer.
- **Attribution required.** "Z-Anatomy — The libre 3D atlas of anatomy — CC BY-SA 4.0",
  plus the BodyParts3D notice, plus contributing institutions listed in the repository.

**Update 2026-09-30.** Z-Anatomy is now shipped as `anatomy-v2` (about 2,600 structures per body). The repository states that some models inside it are adapted from third parties: the inner ear is CC BY-NC-SA 4.0 (University of Dundee) and the kidney CC BY-NC 4.0; both are excluded, as are brain and spinal-cord internals of unverified provenance. Meshes are not tagged by origin, so any undocumented third-party model would not be caught: legal review should confirm before commercial launch. BodyParts3D's own site now says CC BY 4.0 while its repository and Z-Anatomy say CC BY-SA 2.1 JP; we attribute both and ship at CC BY-SA 4.0.

### 2.3 HuBMAP Human Reference Atlas (HRA) 3D Reference Objects
- **Quality.** Professionally modelled organs approved by organ experts; male and female;
  GLB; consistent scale and placement. Does not cover muscles, bones, nerves in full-body
  detail — it is an organ atlas.
- **Commercial viability.** CC BY 4.0, no ShareAlike. This is the cleanest source we have and
  the backbone of the **female** body in v1 (organs) combined with a mirrored/adjusted
  skeleton from Z-Anatomy where no female-specific data exists (flagged in UI as "reference
  derived from male dataset" until replaced — see §6).
- **Maintenance.** Versioned releases (v1.x → v2.x), funded NIH programme; active.
- **Attribution.** "Human Reference Atlas 3D Reference Object Library, HuBMAP Consortium,
  CC BY 4.0", with version.

### 2.4 Open Anatomy Project / SPL atlases
- **Quality.** Region atlases (brain, abdomen, knee, head & neck, inner ear) with labelled
  meshes derived from real MRI/CT, and the source volumes. Perfect for radiology
  synchronisation because mesh and image share a coordinate frame.
- **Commercial viability.** 3D Slicer licence: commercial use and sublicensing permitted;
  must preserve notices, mark modifications, not use Brigham's trademarks. Disclaims
  clinical use, which matches our own disclaimer.
- **Maintenance.** Low activity since ~2020; assets stable.

### 2.5 Visible Human Project
- Since July 2019 no licence or registration; terms and conditions only. Attribution to NLM
  is customary. Use: cryosection cross-sections, CT/MRI stacks for the radiology module and
  cross-sectional learning. Large (tens of GB) — we pre-process into tiled slice pyramids.

### 2.6 TotalSegmentator
- Data CC BY 4.0; tool Apache 2.0. Use the dataset for labelled CT cases and the tool to
  segment new de-identified cases uploaded by partner institutions (server-side job, Phase C).

### 2.7 TCIA
- Default CC BY 3.0/4.0 but some collections are restricted; the ingestion manifest records
  the collection licence and blocks anything not CC BY.

### 2.8 OpenStax A&P 2e
- CC BY 4.0. Used as the seed for descriptions, functions and embryology overview, always
  cited to chapter and section. Depth is undergraduate; MBBS/PG records need supplementary
  citations to standard textbooks (citing a textbook is fine; copying its text is not).

### 2.9 Ontologies and terminologies
- FMA (CC BY 3.0) is the primary key for every structure. UBERON (CC BY 3.0) cross-reference
  enables interoperability with research datasets. TA2 terms are used as the "Latin name" and
  official English term; we do not redistribute the TA2 document. SNOMED CT mapping is an
  optional tenant feature: free for Indian tenants (Member country, NRCeS handles licences);
  non-Member-country tenants must hold their own affiliate licence, and we store the mapping
  behind a feature flag so the core product never ships SNOMED content.

### 2.10 Excluded sources and what replaces them

| Excluded | Why | Replacement plan |
|---|---|---|
| Michigan Histology | NC | Partner-institution slide scanning programme (ADR-002); Wikimedia Commons slides with CC BY/CC BY-SA per-file checks; TCGA/GDC open-access WSIs for pathology (open, citation required; verify per-project). |
| Radiopaedia | NC | TCIA, TotalSegmentator, Visible Human, partner de-identified cases. |
| 3D Atlas of Human Embryology | NC-ND | Commissioned embryology model set (procedural + sculpted) using published Carnegie stage descriptions as the specification (facts are not copyrightable; illustrations are). Budgeted in Phase H. |
| Virtual Human Embryo | ARR | Same as above. |
| Wikipedia text | SA would propagate into our knowledge base | Original content, cited. |

## 3. Software licences (all permissive)

Three.js (MIT), React Three Fiber and drei (MIT), three-mesh-bvh (MIT), meshoptimizer and
gltfpack (MIT), Draco (Apache 2.0), KTX-Software/Basis Universal (Apache 2.0), OpenSeadragon
(BSD-3), Cornerstone3D (MIT), Next.js (MIT), Prisma (Apache 2.0), Zustand (MIT), Tailwind
(MIT), BullMQ (MIT), ioredis (MIT), pgvector (PostgreSQL licence). Obligations: keep licence
files in `THIRD_PARTY_NOTICES.md`, generated by `scripts/licenses.ts` on each release.

## 4. Attribution requirements (consolidated)

Displayed at `/about/attribution` in every tenant (cannot be removed by white-label config —
this is a licence obligation, and the white-label contract says so) and embedded as metadata
in every exported asset:

1. BodyParts3D, © The Database Center for Life Science, CC BY-SA 2.1 Japan.
2. Z-Anatomy — The libre 3D atlas of anatomy, CC BY-SA 4.0, and its listed contributors.
3. Human Reference Atlas 3D Reference Object Library, HuBMAP Consortium, CC BY 4.0, version N.
4. Open Anatomy Project / Surgical Planning Laboratory, Brigham and Women's Hospital, under the
   3D Slicer licence; modifications marked.
5. Visible Human Project, U.S. National Library of Medicine.
6. TotalSegmentator dataset (Wasserthal et al.), CC BY 4.0.
7. TCIA collections, each with its own citation as listed in the manifest.
8. OpenStax, Anatomy and Physiology 2e, CC BY 4.0, with section links.
9. FMA (University of Washington Structural Informatics Group, CC BY 3.0); UBERON (CC BY 3.0).
10. Per-file attributions for Wikimedia Commons and NIH 3D assets.

## 5. ShareAlike containment strategy

The only copyleft-like obligation in the stack is CC BY-SA on mesh derivatives. Containment:

- **Asset pack repository** (`vesalia-open-atlas`, public, CC BY-SA 4.0) holds all mesh
  derivatives, LODs and the structure-to-FMA manifest. The platform loads it from our CDN.
- **Platform code, knowledge records, simulations, assessments, UI, and tenant content** are
  separate works arranged in a collection; they are proprietary.
- **Textures and materials we author** that are baked *onto* SA meshes are adaptations and
  go into the open pack; procedural materials defined in code are not.
- Legal review sign-off required before v1 launch; the review checks that no SA-derived
  artefact lives outside the open pack.

## 6. Components that must be replaced before enterprise-scale commercialisation

| Component | Why replace | When | Estimated cost |
|---|---|---|---|
| Male full-body meshes (Z-Anatomy/BodyParts3D) | MRI-derived topology; SA licence limits exclusivity; no textures; some structures missing (fascia, surface anatomy detail) | Month 12–24 | Commissioned medical-illustration model set: USD 250–400k for male + female, 14 systems, 3 LODs, PBR materials |
| Female body (HRA organs + adapted skeleton) | Only organs are truly female-sourced | Month 12–24 | Included above |
| Embryology models | No commercially usable open set exists | Month 6–15 | USD 60–90k for CS1–23 + fetal milestones |
| Histology slide library | NC restrictions on best open sets | Month 3 onward, continuous | Partner scanning; ~USD 40 per slide at scale, target 600 slides |
| Radiology cases | Open sets are cancer-skewed; need normal anatomy teaching cases | Month 6 onward | Partner de-identified cases; TotalSegmentator for masks |
| Seed text from OpenStax | Undergraduate depth | Month 0 onward | Faculty authoring at ~USD 60–120 per record for MBBS depth |

## 7. Sources consulted

- Z-Anatomy: https://github.com/Z-Anatomy/Models-of-human-anatomy ; https://conference.blender.org/2022/presentations/1365/ ; https://zenodo.org/records/4953712
- BodyParts3D: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html ; https://github.com/Kevin-Mattheus-Moerman/BodyParts3D/blob/main/LICENSE_content
- HuBMAP HRA 3D reference objects: https://hubmapconsortium.github.io/ccf/pages/ccf-3d-reference-library.html ; https://humanatlas.io/3d-reference-library
- Open Anatomy Project: https://www.openanatomy.org/technology.html ; https://www.openanatomy.org/atlas-pages/slicer-license.html
- Visible Human Project: https://www.nlm.nih.gov/research/visible/getting_data.html
- TotalSegmentator: https://github.com/wasserth/TotalSegmentator ; https://arxiv.org/pdf/2208.05868
- TCIA: https://www.cancerimagingarchive.net/data-usage-policies-and-restrictions/
- OpenStax A&P 2e: https://openstax.org/details/books/anatomy-and-physiology-2e
- FMA: http://si.washington.edu/info-books/project-details/foundational-model-of-anatomy/accessing-the-fma-ontology/ ; UBERON: https://obofoundry.org/ontology/uberon.html
- SNOMED CT licensing: https://docs.snomed.org/snomed-ct-practical-guides/vendor-introduction-to-snomed-ct/7-licensing ; https://www.nrces.in/faqs
- Michigan Histology licence: https://anatomypubs.onlinelibrary.wiley.com/doi/10.1002/ase.2239
- Radiopaedia terms: https://radiopaedia.org/terms
- 3D Atlas of Human Embryology: https://www.3dembryoatlas.com/
- Virtual Human Embryo: https://www.ehd.org/virtual-human-embryo/
- NIH 3D: https://3d.nih.gov/
- Human-Atlas (reference implementation): https://github.com/slorksmo/Human-Atlas
- OpenSeadragon licence: https://openseadragon.github.io/license/ ; Cornerstone3D: https://github.com/cornerstonejs/cornerstone3D
