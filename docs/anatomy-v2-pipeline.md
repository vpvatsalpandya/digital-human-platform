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
npm run assets:build:v2 && npm run assets:build:schematic   (adds the generated `schematic` group; idempotent, ~2 s)
npx tsx scripts/qa/dump.ts /workspace/qa/dump                    (decode the merged body for the QA scripts, ~5 s)
python3 scripts/assets/extract/core_rebase.py <registered> /workspace/qa/dump /workspace/work/core-rebase
npx tsx scripts/assets/rebuild-core.ts --in /workspace/work/core-rebase   (re-bake the core aggregates in the united frame)
npx tsx scripts/qa/dump.ts /workspace/qa/dump                    (the rebuilt core skin)
python3 scripts/qa/skin_field.py                                 (signed skin-depth field the schematic containment pass reads, ~10 s)
npm run assets:build:schematic && npx tsx scripts/qa/dump.ts /workspace/qa/dump
python3 scripts/qa/outside.py                                    (>= 20 % outside the skin: expect none)
python3 scripts/qa/gapcheck.py                                   (outside-skin share and nearest real neighbours of the gap-fill stand-ins, schematic/gaps.ts)
python3 scripts/assets/gap-audit.py . > docs/gap-audit.md
```

Stage 5 of the registration, `extract/snap_in.py`, runs once on `/workspace/work/registered` (after `register.py` and the limb fits, before
`assets:build:v2`; it keeps no state, so re-run it on a fresh registration). It takes real soft-tissue structures (bursae, veins, nerves, ligaments, tendons,
muscles, glands, sheaths, fasciae; reference planes, movement and region labels are never touched) with >= 20 % of their vertices more than 4 mm outside the
united skin and brings them in: rigidly for short structures, softly for long ones, and the nail folds (`perionyx`, which sit on the skin but are smaller than
the 4 mm QA voxel) to the surface. The log is printed; nothing else moves. It is a safety net, not a substitute for a correct fit: before the ankle fix below it
had to carry the male right bursa of the medial malleolus 36.9 mm and the great saphenous vein 38.5 mm; with the bones registered correctly it only touches the
nail folds (male 2, female 1).

#### Ankle / shank fix (anatomy-fixes-4)

Root cause of the male right ankle (distal tibia 3-4 cm medial of the talus, medial malleolus up to 36 mm outside the skin): in `register.apply_legs` the
per-leg transform is multiplied by a midline gate `wx = clip((|x| - 1 cm) / 4 cm)` that keeps the pelvic floor and the other leg out of a leg's transform. It was
applied all the way down the leg. The global spine fit leaves the Z-Anatomy body about 16 mm off the HRA midline, so the right medial malleolus (`|x|` 29 mm) lay in
the 1-5 cm ramp and received only 49 % of the shank transform (talus 90 %, navicular 87 %) while the lateral malleolus received 100 %: the tibia was sheared by up
to 43 mm (malleolar span 107 mm against 73 mm on the left), the foot bones were fitted to a torn tibia/foot cloud (foot cost 0.60 against 0.16 on the left) and the
medial soft tissue followed. The left ankle was fine only because the offset happens to push that side out of the ramp. The female left ankle had the mirror
problem (tibia weight 0.44, malleolar span 77 mm against 54 mm on the right, tibia 13 mm outside the skin). The distal femur / medial knee tissue was sheared the same
way (up to 26 mm). `leg_refine` did not see it because it measures the rigid transform, not the blended result.

Fix: below the knee the gate is opened completely (`SHANK_GATE_TOP`: fading in over the 12 cm above the knee); the side test (`x > 0` / `x < 0`) stays, so the
legs still do not borrow each other's tissue. The groin and thigh keep the ramp. `scripts/qa/anklefit.py` reports the numbers (tibia/fibula distal to the talar dome and
lateral facet, malleolar span, depth of the distal tibia in the skin, % of shank/foot vertices outside the skin, left/right differences) and
`tests/anatomy-qa.test.ts` pins the left/right mirror of the tibia and fibula relative to the talus.

`assets:build:v2` deletes and rewrites the whole pack, so always run `assets:build:schematic` straight after it. `rebuild-core.ts`
edits the core pack (`hra-v1`) in place and is idempotent, but it must come after `assets:build:v2` because it merges the registered
detail meshes into the core aggregates; run `assets:build:schematic` again afterwards.

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

#### Limb-segment fitting (arms, hands, fingers, legs, feet)

The three-stage fit above puts the trunk and spine in the right place but leaves the limbs wrong wherever the Z-Anatomy subject
holds a limb differently from the HRA body (the HRA arms are abducted in an A-pose; Z-Anatomy's hang by the side). Stage 3 is therefore
per segment (`extract/limbs.py`, driven from `register.py`):

- **Arms**: a three-segment chain (shoulder about the humeral head, elbow, wrist) is fitted by maximising the depth of the arm bones inside
  an arm-only skin compartment (`arm_field`), with caps on translation, a prior that the arm hangs (elbow below shoulder, wrist below elbow,
  which removes a folded-back local optimum) and several starts. Soft tissue follows by linear blend skinning. Scapula, clavicle and trunk
  bones never follow the arm.
- **Fingers**: each finger is a three-joint chain (MCP, PIP, DIP) posed inside the skin finger; MCP swing is capped (~17 degrees, thumb 35)
  and fingers must stay in anatomical order, at least 1 cm apart, so a finger cannot swap into its neighbour's skin.
- **Legs**: per-bone similarity ICP (femur, tibia+fibula, patella) onto the HRA bones with the scale clamped to the length ratio +/-4 %,
  blended across the knee and the groin.
- **Feet**: posed about the ankle and the toes about the metatarsophalangeal line, inside one body half of the skin (`leg_field`).

`scripts/qa/` measures the result: `outside.py` lists structures at least 20 % outside the skin solid (`extract/solid.py`),
`icp_core.py` checks that core aggregates share the detail frame, `render.py` is an offline orthographic renderer, and
`dump.ts` decodes the merged body for them. The vitest file `tests/anatomy-qa.test.ts` runs the same sanity rules in CI
(sex allow/deny lists, bone completeness, laterality, duplicates, naming, system-chip to pack mapping).

#### Containment, head fit and left/right checks (anatomy-fixes-3)

After the limb stages `register.py` runs a fourth, per-structure stage (`limbs.py: refit`, `contain`):

- **Refit**: a structure still 15 % or more outside the skin is shifted as one rigid body (translation capped at 15 mm, regularised) so its
  shape is kept. Articulated rigid bodies (phalanges, patella, vertebrae, ribs, long bones, skull, cartilages, ossicles, regions) are
  exempt: a phalanx moved 2 cm away from its metacarpal is not a better fit, those are posed by stage 3 instead.
- **Contain**: remaining vertices more than 2 mm outside the skin are pulled in by at most 12 mm, smoothed over neighbours. Nails, hair,
  skin layers, ear, eyes and teeth are exempt (they sit on or in the skin by design).
- **Head**: the HRA brain is the reference; the Z-Anatomy head structures (skull, face, soft tissue; blended into the neck) get a uniform scale and a
  translation until the brain regions lie inside the cranial vault hull (female: scale 1.059, brain inside 87 % -> 99.9 %, worst exceedance 12.6 -> 3 mm).
- **Left/right**: Z-Anatomy files one side of some pairs without a suffix, or as "Left X" next to "Right X.r"; the build pairs them
  (`zSides`, `pairKey`). Kidney pyramids/papillae/calyces without a side take it from their x position. Remaining lone -l/-r ids are the
  ones where the other side does not exist anatomically (`scripts/qa/orphans.py`: right-only intermediate and middle lobar bronchus, kidney
  calyx/pyramid counts that differ between sides in the HRA kidneys).
- **Brain regions**: the Allen atlas objects in the HRA library come as `_L` and `_R` for all 141 regions (282 per body, checked on the
  source index), so no hemisphere is missing and nothing is mirrored. The older comment that the Allen model holds one hemisphere was wrong
  and has been removed. A hemisphere label always follows the geometry (`allenSide`: lower x is the body's right).
- **Netlify hydration error #418**: Netlify injects `\n<!-- This site is hosted on Netlify ... -->` after the charset meta in `<head>` of
  every page; React 19 hydrates `<head>` as a singleton and throws on the stray whitespace text node. `src/lib/head-clean.ts` is an inline
  script that removes whitespace-only text nodes from `<head>` while it is still being parsed. A no-op elsewhere (Vercel never shows it).

QA scripts for these: `limbfit.py` (hands, fingers, lower leg, feet), `legfit.py`, `headfit.py` (brain inside vault hull), `orphans.py`,
`outside.py`, `limbshots.py` (renders). Results are asserted in `tests/anatomy-qa.test.ts` (registration sanity) and `tests/head-clean.test.ts`.

#### Core pack frame (`rebuild-core.ts`)

The core pack (`hra-v1`) was baked from standalone reference-atlas files and BodyParts3D meshes placed by a stature-scaled fit. They
sat 2 cm (male) to 5-8 cm and ~10 % in size (female) away from the united model that the detail packs, skin shells and registered
Z-Anatomy structures use, so the core skull, ribs, heart and brain no longer lined up with the skin or with the detail layers
(female skull 33 % and brain 22 % outside the skin). `core_rebase.py` rebuilds each affected core id in the united frame: from the
united reference-atlas meshes (skin, heart, aorta, IVC, trachea, spleen, thymus, pelvis, brain, large intestine), or by merging the
registered detail meshes (skull, vertebral column, rib cage, humerus, radius+ulna, deltoid, biceps, pectoralis, quadriceps,
gastrocnemius, stomach, adrenals, testes), so an aggregate and its parts coincide exactly. Those aggregates now carry provenance
`zanatomy`. The jugular notch and umbilicus landmarks are measured on the united skin. After the rebuild every reference-atlas core
structure matches the united model with zero residual (`icp_core.py`).

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

### Sex-specific anatomy and the female external genitalia

`detail-catalog.ts` exports `MALE_ONLY` and `FEMALE_ONLY` and denies each on the other body, for Z-Anatomy and the reference atlas alike
(the female body no longer receives the penile urethra mesh or any penis/testis/prostate/seminal part; the male body no longer receives
uterine-tube, cardinal/uterosacral or other female parts; uterine-tube items are classified as reproductive, not digestive).
Open meshes of the female external genitalia do not exist in the sources, so `schematic/more.ts` generates them, labelled
"(schematic)", provenance `generated`, category `schematic organ`: female urethra, glans, body and crura of the clitoris, vestibular bulbs,
greater vestibular glands, labia minora and majora, and the vestibule of the vagina, placed from the real vagina, pubic symphysis,
bladder, skin and hip bones. `tests/anatomy-qa.test.ts` holds the allow/deny lists.

### Articular cartilage and further sutures

`schematic/more.ts` also adds articular cartilage pads (two per joint, each side, nine joint types: glenohumeral, humeroulnar, humeroradial,
radiocarpal, tibiofemoral, patellofemoral, talocrural, subtalar, first carpometacarpal; 36 pads per body) as thin domed shells at the closest approach of the
registered bones, and nine more cranial sutures (17 meshes per body, left/right where paired) traced where the registered skull bones meet. 

### Gap-fill placeholders (anatomy-fixes-4)

Everything below is generated (`provenance: generated`, `(schematic)` in the name, violet, Schematic badge, never counted as real anatomy, found by the
search tag "schematic") and is built in `schematic/more.ts` with the same helpers as the other stand-ins. The StructureCard shows a one-line note
(`src/modules/atlas/schematic-notes.ts`).

- `metopic-suture` (frontal bone, midline): usually closed in adults, persists in a minority.
- `umbilical-artery-l/r` (patent proximal part, from the internal iliac towards the bladder apex) and `medial-umbilical-ligament-l/r` (the obliterated remnant
  up the anterior abdominal wall to the umbilicus): adult anatomy, so documented here instead of dropped as "fetal".
- `ligamentum-arteriosum` (aortic arch to the left pulmonary artery), `pituitary-infundibulum`.
- `nipple-l/r`, `areola-l/r` (both sexes; female over the centre of the real HRA mammary gland, male about 4 cm below the sternal angle; slid back until at most 10 % of the shape is outside).
- Serous membranes (category `schematic membrane`): `pleural-cavity-l/r`, `fibrous-pericardium` (shells around the real lungs and heart), peritoneal sheets
  `mesentery`, `transverse-mesocolon`, `sigmoid-mesocolon`, `lesser-omentum`, `gastrosplenic-ligament`, `splenorenal-ligament`.
- Male only (deny/allow lists: `MALE_ONLY` in `detail-catalog.ts` and `tests/anatomy-qa.test.ts`): `membranous-part-of-male-urethra`, `navicular-fossa-of-male-urethra`.
- Skin appendages (category `schematic inset`): six REPRESENTATIVE insets (hair follicle, sebaceous gland, arrector pili, sweat gland, dermal capillary loop,
  dermal nerve ending), about 3x life size, in one patch of abdominal skin 6 cm above the umbilicus, 4.5 mm under the voxel surface, in a frame tilted to the skin
  normal. They are labelled "representative inset (schematic)", are not anatomical and belong to the histology module for real detail.

Checked and already present, so not added: four parathyroid glands, adeno- and neurohypophysis, pleura, round ligament of the liver, ligamentum venosum,
falciform, coronary and triangular ligaments, greater omentum, prostatic urethra, corpus spongiosum of penis, the HRA mammary glands (female).

### Last atlas gaps (anatomy-fixes-4, `schematic/gaps.ts`)

The remaining items from the gap audit are added as generated placeholders with the same flags as above (`provenance: generated`, `(schematic)` in the name,
violet, Schematic badge and note, search tag, never counted as real anatomy; `tests/schematic-gaps.test.ts` pins this). Two new categories, both violet:
`schematic gland` (`#cf9cff`) and `schematic cavity` (`#b9a2f2`). Female +17, male +14 (per body: 7 shared, the rest sex-specific):

| Group | Items | Body | How they are placed |
|---|---|---|---|
| Breast (`schematic gland` / `schematic ligament`) | `breast-envelope-l/r` (thin fat and glandular plate), `suspensory-ligaments-of-breast-l/r` (Cooper's ligaments, about 40 septa), `lactiferous-ducts-l/r` (15 ducts, two branchings each), `axillary-tail-of-breast-l/r` | **female only** (no breast on the male body; `tests/anatomy-qa.test.ts` rejects "breast" there) | The footprint is an ellipse over the real HRA mammary gland that contains the nipple. The envelope is a cap 3.5 mm under the skin (along the skin normal from `skin-field`), 3 mm thick, apex at the nipple, kept in front of the pectoralis major and rib cage (`chestZ`); ligaments run from the fascia over the pectoralis to the envelope, leaning towards the nipple; ducts start in the nipple and end in the gland between chest wall and skin; the tail is a tapering plate from the upper outer quadrant along the lateral chest. A fixed seed makes the ducts reproducible |
| Male urethra and Cowper's glands (`schematic organ` / `schematic gland`) | `bulbar-part-of-male-urethra`, `penile-part-of-male-urethra`, `bulbourethral-gland-l/r`, `duct-of-bulbourethral-gland-l/r` | **male only** (`MALE_ONLY`) | Bulbar (18-50 mm) and penile (50 mm to 14 mm short of the tip) parts are cut from the centre line of the real urethra mesh, next to the existing membranous part and navicular fossa. Each gland (pea sized, 11 mm) is put 12 mm beside the membranous urethra, behind it, then pushed off the real structures around it (`relax`); the duct runs from the gland to the bulbar urethra. The corpus spongiosum already exists and is untouched |
| Serous and fascial spaces (`schematic cavity`) | `pericardial-cavity`, `transverse-pericardial-sinus`, `oblique-pericardial-sinus`, `omental-bursa`, `retropubic-space`, `tympanic-cavity-l/r`; male `rectovesical-pouch`; female `rectouterine-pouch`, `vesicouterine-pouch` | both, except the pouches | Sized from the neighbouring real meshes. The pericardial cavity is a thin shell between the heart and the fibrous pericardium shell; sinuses, pouches and the retropubic space are small hollow ellipsoids pushed off the real structures around them; the omental bursa is a thin sheet between stomach and pancreas; the tympanic cavity is a hollow envelope around the real ossicles |

`relax(p, cloud, sc, maxMove)` pushes a placement point out of the clearance ellipsoid `sc` around all nearby real vertices (muscle, fascia, skin and generated
shapes excluded) by at most `maxMove`, so the shapes sit clear of neighbours where the registered meshes leave room. They cannot always: the registered bladder
touches the pubic symphysis (retropubic space is squeezed, 17-28 % of its vertices within 1 mm of the bladder), and the tympanic cavity necessarily touches the
membrane, the labyrinth and the temporal bone. `scripts/qa/gapcheck.py` prints outside-skin share and the real structures within 1 mm of every new shape. Containment
(`skinfield.ts`) is unchanged: after the 17+14 additions the outside-skin test (`outside.py`, >= 20 % of vertices > 4 mm outside) still gives **0 male / 0 female**.
Schematic group size grows to 0.78 MB (male) and 0.86 MB (female), per-body lazy total 9.5 / 9.6 MB (limit 9.7 MB, group limit 1 MB).

### Containment of stand-ins and the female external genitalia

`scripts/qa/skin_field.py` writes a signed skin-depth field (4 mm voxels) from the dump; `schematic/skinfield.ts` uses it in `build-schematic.ts` to pull every
generated shape that is more than 3 mm outside the skin back to 0.5 mm inside (cap 20 mm, smoothed over two vertex rings; eyes and teeth excepted; nipples and
areolae are slid back rigidly). Without the field file the pass is skipped with a warning, so run `skin_field.py` before the last `assets:build:schematic`.

The female external genitalia (mons pubis, labia, clitoris, vestibule, greater vestibular glands, bulbs) are now built about the true pelvic midline (mean x
of vagina, pubic symphysis and bladder, about 1.5 cm to the body right of x = 0 in the HRA female) instead of x = 0, above the lowest point of the vagina minus 8 mm and
in front of the groin-cleft floor of the skin; before, up to a third of their vertices were outside the skin. The jugular-notch marker in `core_rebase.py` now sits
14.5 mm behind the skin surface at the notch.

Remaining known limits: the skin mesh is sparse on the trunk, so containment is only as exact as the 4 mm field (the male right ankle mis-registration was fixed in the ankle / shank fix above).

### Gap audit

`gap-audit.py` reads the manifests, `gap-checklist.py` (curated per-system checklist) via `gap_eval.py`, and an optional private
TA2 term list (`TA2_CSV`, skipped when absent). Output: before/after counts, a present / schematic / missing checklist by system and
the list of truly remaining items.
