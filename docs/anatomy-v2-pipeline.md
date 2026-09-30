# Detail pack `anatomy-v2`: sources, licences, pipeline

The core pack `hra-v1` (57 male / 59 female structures, 12 MB) is what paints first. The detail
pack `anatomy-v2` adds about 3,000 further named structures per body. It is lazy-loaded by
group; nothing in it blocks first paint.

## Licence decisions (checked 2026-09-30 against the source pages)

| Source | Licence as found | Used? | Notes |
|---|---|---|---|
| Z-Anatomy (github.com/Z-Anatomy/Models-of-human-anatomy) | CC BY-SA 4.0, derived from BodyParts3D; the README lists adapted third-party models | Yes, with exclusions | Meshes are not tagged by origin inside the Blender file. Known third-party non-commercial parts were excluded by name: inner ear (CC BY-NC-SA 4.0, University of Dundee), kidney (CC BY-NC 4.0, Lissie Cowley), and brain / spinal-cord / white-matter internals whose UW Brainder provenance could not be verified. **Residual risk:** any other adapted model inside Z-Anatomy whose licence is not stated in the repository would be undetected. |
| BodyParts3D (DBCLS) | Its repository and Z-Anatomy document CC BY-SA 2.1 JP; the DBCLS site now states CC BY 4.0 (updated 2025-02-27) | Via Z-Anatomy | The two statements disagree. We attribute both and keep all derived meshes at CC BY-SA 4.0, which is compatible with either. |
| HuBMAP Human Reference Atlas 3D Reference Object Library | CC BY 4.0, verified per object | Yes | Also the Allen Human Reference Atlas brain regions. |
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

12 groups per body, each under 2.3 MB: core-upgrades (auto), skin-layers (auto), skeleton, joints,
muscles, fascia-bursae, arteries, veins, nerves, lymphatic, organ-parts, brain-regions. Groups
render as one merged mesh each, with per-vertex state for hide / ghost / select, and BVH picking
maps a hit triangle back to its structure.

### Layers and the peel-away control

Every structure carries `layer` 0–6 (skin, dermis, hypodermis and fat, deep fascia, superficial
muscle, deep muscle and bursae, skeleton and joints). The **Layers** tool peels layers below the
chosen depth. The dermis and hypodermis shells are offsets of the real HRA skin surface (4 mm and
14 mm inward), have provenance `generated`, are labelled schematic on screen and are never counted
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
