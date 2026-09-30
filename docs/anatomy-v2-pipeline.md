# Detail pack `anatomy-v2`: sources, licences, pipeline

The core pack `hra-v1` (57 male / 59 female structures, 12 MB) is what paints first. The detail
pack `anatomy-v2` adds about 3,500 further named structures per body. It is lazy-loaded by
group; nothing in it blocks first paint.

## Licence decisions (checked 2026-09-30 against the source pages)

| Source | Licence as found | Used? | Notes |
|---|---|---|---|
| Z-Anatomy (github.com/Z-Anatomy/Models-of-human-anatomy) | CC BY-SA 4.0, derived from BodyParts3D; the README lists adapted third-party models | Yes, with exclusions | Meshes are not tagged by origin inside the Blender file. Known third-party non-commercial parts were excluded by name: inner ear (CC BY-NC-SA 4.0, University of Dundee), kidney (CC BY-NC 4.0, Lissie Cowley), and brain / spinal-cord / white-matter internals whose UW Brainder provenance could not be verified. **Residual risk:** any other adapted model inside Z-Anatomy whose licence is not stated in the repository would be undetected. |
| BodyParts3D (DBCLS) | Its repository and Z-Anatomy document CC BY-SA 2.1 JP; the DBCLS site now states CC BY 4.0 (updated 2025-02-27) | Via Z-Anatomy | The two statements disagree. We attribute both and keep all derived meshes at CC BY-SA 4.0, which is compatible with either. |
| HuBMAP Human Reference Atlas 3D Reference Object Library | CC BY 4.0, verified per object | Yes | Also the Allen Human Reference Atlas brain regions. |
| OpenEar library of 3D models of the human temporal bone (Zenodo 1473724; Sieber et al., Sci Data 2018, doi:10.1038/sdata.2018.297) | CC BY 4.0 (Zenodo record metadata, re-checked 2026-09-30) | Yes: specimen ALPHA (right temporal bone) | Scala tympani, scala vestibuli, round window, external acoustic meatus. Specimens DELTA (NaN vertices in the scala tympani) and THETA (malformed PLY header) were not used. |
| IE-Map human inner-ear atlas and template (Zenodo 10625570; Ahmadi et al., Sci Rep 2021, doi:10.1038/s41598-021-82716-0) | CC BY 4.0 (Zenodo metadata, GitHub LICENSE and README agree); its surfaces derive from David et al. 2016 (doi:10.1038/srep32772) and Wimmer et al. 2019 (doi:10.1016/j.dib.2019.104782), both CC BY 4.0 | Yes | Cochlear duct, three semicircular ducts, three ampullae, utricle, saccule. Fitted onto the OpenEar scala tympani (about 1 mm residual). |
| HRA vessels that Z-Anatomy lacks | CC BY 4.0 | Yes, by allow-list (`HRA_VESSEL_ALLOW` in `detail-catalog.ts`) | Coronary and cardiac veins, hepatic/portal branches, sigmoid/colic/rectal/pancreaticoduodenal vessels, retinal vessels, uterine vessels (female). |
| SimTK Visible Human lower extremity; virtual-body.org segmented Visible Human (Zenodo 15882019); UMN laryngotracheal model; Deep Blue Circle of Willis STL; TopCoW; Open Knee; TotalSegmentator MRI | Article CC BY but download licence unverified (SimTK); CC BY 4.0 but voxel labels only (virtual-body.org); behind a WAF, unverified (UMN, Deep Blue); CC BY-NC (TopCoW, Open Knee, TotalSegmentator MRI) | No | Excluded or not usable as meshes. virtual-body.org could be a future source via marching cubes. |
| Terminologia Anatomica 2 (TA2) | Document published under CC BY-ND | Terms only | Latin names are matched from a private copy for lookup and are not redistributed; no TA2 file is in the repository. |
| NIH 3D, Open Anatomy Project, Visible Human, TotalSegmentator, Allen atlas (other than through HRA), Open3DHP | **Not verified in this pass** | No | Left out rather than assumed. See `05-licensing-audit.md` for the earlier desk review. |

Excluded and never to be re-added without a fresh licence check: anything NonCommercial or
NoDerivatives. `scripts/validate-manifests.ts` and `src/engine/manifest.ts` reject those licences,
and `tests/anatomy-v2.test.ts` also scans the pack for `-NC`/`-ND` strings.

## ShareAlike

The meshes in `public/assets/anatomy-v2/` are adaptations of CC BY-SA material (decimated,
registered to a different body, re-encoded). They are therefore released under **CC BY-SA 4.0**,
with attribution to Z-Anatomy, BodyParts3D/DBCLS and the HRA as written in each manifest's
`attribution` field, shown on `/about/attribution` and on the structure card. Keep the pack in
the open asset repository as described in `05-licensing-audit.md` §5; platform code stays
separate. This needs legal sign-off before commercial launch.

## Pipeline

```
OpenEar / IE-Map --extract/ear/*.py--> /workspace/work/ear-registered/<body>/<part>.{l,r}.bin
   (reg*.py: fit the OpenEar right ear to each body's real malleus/incus/stapes; ie3.py: fit IE-Map to the scala tympani;
    final*.py: write the per-body files; the left ear is the right ear mirrored and re-registered to the left ossicles)
Z-Anatomy .blend --extract/zanat-export.py (Blender, headless)--> /workspace/sources/zanat/{index.json, objs/*.bin}
HRA united GLBs  --extract/hra-united-export.mts--> hra/objs-{m,f}/{index.json, *.bin}
zanat -> HRA body space:  python3 extract/register.py   (per body; writes work/registered/<body>/)
npm run assets:build:v2   (scripts/assets/build-detail.ts, ~25 s)
   classify (detail-catalog.ts) -> weld -> decimate per category -> quantise 16-bit in own bbox
   -> meshopt -> slice into group-<id>.bin -> manifest with `packed` byte ranges
npm run assets:build:schematic   (adds the generated `schematic` group; idempotent, ~2 s)
python3 scripts/assets/gap-audit.py . > docs/gap-audit.md
```

`assets:build:v2` deletes and rewrites the whole pack, so always run `assets:build:schematic` straight after it.

The source dumps live outside git (`/workspace/sources`, several GB) and must be re-fetched to
rebuild; the built pack is what is committed. Paths are constants at the top of
`build-detail.ts` and `register.py`.

### Registration

Z-Anatomy is one male subject; each HRA body is a different person. `register.py` fits it in three
stages: global uniform scale and translation from landmarks, a displacement that follows the
spine, and a similarity transform per leg. Residuals: spine about 4 mm RMS; leg landmarks
24–40 mm (male), 8–18 mm (female). The female body uses the same male-derived skeleton, muscles,
nerves and vessels; sex-specific organs come from the female HRA objects. Side labels that
contradict the geometry are corrected in the build (`sideByGeometry`).

### Groups (lazy)

14 groups per body, each under 3 MB (about 9.3 MB in all): core-upgrades (auto), skin-layers (auto, 61-77 KB), skeleton, joints,
muscles, fascia-bursae, arteries, veins, nerves, lymphatic, organ-parts, brain-regions, inner-ear, schematic. Only core-upgrades and skin-layers load on their own;
everything else downloads when its group, a search hit or a layer step turns it on. Groups
render as one merged mesh each, with per-vertex state for hide / ghost / select, and BVH picking
maps a hit triangle back to its structure.

### Layers and the peel-away control

Every structure carries `layer` 0–6 (skin, dermis, hypodermis and fat, deep fascia, superficial
muscle, deep muscle and bursae, skeleton and joints). The **Layers** tool peels layers below the
chosen depth. The five skin shells (epidermis 0.8 mm, papillary dermis 2 mm, reticular dermis 4 mm, membranous subcutaneous layer 9 mm, hypodermis 14 mm inward) are offsets of the real HRA skin surface, have provenance `generated`, are labelled schematic on screen and are never counted
as real anatomy.

### Schematic stand-ins (group `schematic`)

Things no open scan provides are generated, not fetched: the 31 named spinal nerve pairs, the
cervical, lumbar and sacral plexuses, autonomic ganglia and plexuses, splanchnic, vagal and
phrenic branches, the four third molars and small vessel branches. `build-schematic.ts` places
tubes and blobs from the registered vertebrae, discs, cord, sacrum, ribs, nerves, vessels and
organs of each body (female gets the female-only vessels), then packs them like any other
group (about 0.3 MB per body). Every one has provenance `generated`, a category starting
`schematic`, a name ending "(schematic)", violet colour, a badge on the structure card and a
"Schematic" tag in search. They are never counted as real anatomy (`isRealAnatomy`), and
`tests/schematic.test.ts` enforces this along with the 31 pairs, plausible placement, sides,
sex-appropriate vessels, search and the byte budget. Licence: the generated meshes are our own
work derived from CC BY-SA positions and are released under CC BY-SA 4.0 with the rest of the pack.

### Inner ear (group `inner-ear`, real)

Thirteen structures per side (26 per body): OpenEar (scala tympani, scala vestibuli, round window, external acoustic
meatus) and IE-Map (cochlear duct, semicircular ducts, ampullae, utricle, saccule). Provenance `openear` / `iemap`, counted
as real anatomy. Registration keeps real size (scale about 1.0): ossicle RMS 0.50-0.60 mm, IE-Map about 1 mm against the
OpenEar scala tympani. **Caveats:** the labyrinth is a template from a different subject than the ossicles, and the left ear is
the right ear mirrored, not a separate scan. The structure card says so.

### Second schematic batch

`schematic/extra.ts`: about 25 cutaneous and small nerves, six cranial ganglia, about 40 small arteries and veins, the thoracic duct,
SA/AV node, AV bundle and bundle branches, eyelids, tarsal plates, periorbita, tracheal, cuneiform and auricular cartilages,
vestibular and vocal folds, tensor tympani and stapedius, three cranial sutures, 46 facet-joint capsules and four other capsules,
three tendons. Same flagging as the first batch.

### Gap audit

`gap-audit.py` reads the manifests, `gap-checklist.py` (curated per-system checklist) via `gap_eval.py`, and an optional private
TA2 term list (`TA2_CSV`, skipped when absent). Output: before/after counts, a present / schematic / missing checklist by system and
the list of truly remaining items.
