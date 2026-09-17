# Phase F · UI/UX Specification

## 1. Principles
1. **Thumb-first.** Primary actions in the bottom 40% of the screen; the 3D canvas is
   full-bleed; panels are bottom sheets, never sidebars, on < 768 px.
2. **Never block the canvas.** Loading is progressive with a visible per-system progress
   ring; interaction is possible as soon as the skeleton is in.
3. **One structure, one card.** Selecting anything (3D, slide, slice, timeline) opens the same
   structure card with the same tabs.
4. **State is shareable.** Every view has a URL (`/atlas?v=<viewId>`), every card has a
   deep link.
5. **Modes change tone, not layout.**

## 2. Information architecture

```
Home (mode-aware) ─ Atlas ─ Physiology ─ Histology ─ Embryology ─ Pathology ─ Radiology
                 ─ Assess ─ Tutor ─ Me (progress, bookmarks, views)
Faculty: Dashboard ─ Lessons ─ Assessments ─ Item bank ─ Review queue ─ Cohorts
Admin: Overview ─ Users & roles ─ Departments ─ Branding ─ SSO/LTI ─ Plan & billing ─ Audit
```

## 3. Atlas screen (mobile)

- Top bar: body toggle (♂/♀), search, view menu (save/load).
- Canvas: full screen; system chips scroll horizontally above the bottom sheet.
- Bottom sheet (3 snap points: peek 96 px, half, full): structure card or tool tray.
- Tool tray (icons, 48 px targets): Isolate · Hide · Fade · Explode · Transparency · Clip ·
  Compare · Reset. Sliders appear inline above the tray.
- Gestures: 1-finger orbit, 2-finger pan/zoom, tap select, long-press multi-select, double-tap
  focus, 3-finger tap reset. Desktop: left-drag orbit, right-drag pan, wheel zoom, click,
  shift-click multi, keyboard (arrows orbit, F focus, H hide, I isolate, Esc reset).
- Structure card tabs: Overview · Relations · Supply · Clinical · Histology · Embryo ·
  Imaging · Quiz. Tab visibility by mode. Citations as chips with source popover.
- Accessibility: "Describe view" button reads an auto-generated description; structure tree
  (list view) as a full alternative to the canvas.

## 4. Physiology screen
Simulation canvas (Wiggers/PV loop) on top; parameter sliders bottom sheet; "Predict" step
before "Run"; "How this works" drawer with equations and citations; linked 3D heart valves
animate in a mini viewport.

## 5. Histology screen
Deep-zoom viewer full-bleed; minimap top-right; scale bar; magnification presets (4×, 10×,
40×); annotation toggle; mode selector (guided/self/assessment); hotspot cards in bottom sheet.

## 6. Embryology screen
Horizontal timeline with week and Carnegie-stage scrubber; stage card; lineage tree; anomaly
branches shown as red forks with a card.

## 7. Pathology screen
Swipe comparator (normal | disease) with a draggable divider; toggle side-by-side; overlay
toggle in atlas.

## 8. Radiology screen
Slice viewer full-bleed; modality tabs; plane selector; scroll = swipe or slider; window/level
presets; "Show in 3D" toggles a split view; landmark labels toggle; "Identify" mode for exams.

## 9. Assessment
Exam runner: locked layout, server timer, station progress, answer input (type-ahead with
synonyms hidden), flag-for-review; offline banner and queued submissions. Examiner app:
checklist per candidate with big toggles, global rating, notes; works on a phone.

## 10. Faculty authoring
Lesson builder: steps as cards, each step captures the current atlas/slide/slice state with
one tap ("Capture view"); assessment builder: item bank table with filters, "pin in 3D" item
creator, blueprint coverage chart, publish dialog with cohort and window. Review queue:
split view record vs sources.

## 11. Dashboards
Student: mastery ring per system, weak structures list, streak, upcoming exams, time this
week. Faculty: cohort heatmap (region × competency), item analysis table, at-risk learners.
Admin: activation, seat usage, department comparison, benchmarking (opt-in), error reports.

## 12. Design system
Tokens (CSS variables): `--color-bg`, `--color-surface`, `--color-primary`, `--color-accent`,
`--color-text`, `--radius`, `--font-sans`; dark mode via `prefers-color-scheme` and tenant
default. Components: Button, Chip, Sheet, Slider, Tabs, Card, DataTable, Toast, Dialog. All
built on native elements with ARIA; focus rings never removed. Minimum touch target 44 px.

## 13. Performance UX
Skeleton loads; per-system progress; "Low bandwidth" toggle in the top bar; quality indicator
(auto/high/low); battery saver reduces frame rate to 30 and disables shadows.

## 14. Localisation
UI strings via ICU messages; content fields carry language variants; RTL mirrored layout;
numerals localised; term vocabulary preference (TA vs common) per mode and tenant.

## 15. Alternatives considered
- Sidebar-first layout (incumbents): fails on phones. Bottom sheets chosen.
- Separate mobile app UI: rejected; one responsive system with breakpoint-specific containers.
