# A-07 · User Journeys

Journeys are written as sequences the product must support end-to-end. Each step names the
module and the requirement IDs (A-02) it exercises. Failure points list what the design must
prevent.

## J1 · Priya revises after dissection (mobile, evening, 4G)
1. Opens PWA from home screen → resumes last session offline (FR-E13).
2. Searches "median nerve" (FR-E3) → record card opens with relations and course.
3. Taps "isolate with related" → nerve + muscles it supplies are shown, rest faded (FR-E4).
4. Drags explode slider to separate flexor compartment (FR-E5).
5. Opens "Clinical" tab → carpal tunnel syndrome, cited (FR-K2).
6. Taps "See on MRI" → axial wrist slice with the nerve mask highlighted (FR-R2).
7. Saves view "median nerve – forearm" and bookmarks the structure (FR-E9, E10).
8. Starts 10-station quick spotter on upper limb (FR-A1); sees 7/10 and weak area: cubital
   fossa contents (FR-An1).
Failure points to prevent: asset load > 8 s on 4G; lost state on tab kill; incorrect
mask-to-structure mapping; spotter answer accepted for wrong synonym (synonyms must resolve).

## J2 · Dr. Meenakshi authors and runs a spotter (desktop + students on mobile)
1. Faculty portal → New assessment → Spotter (FR-F1, FR-A1).
2. Picks 30 items from item bank filtered by "upper limb, MBBS, CBME AN10–AN13"; adds 5 new
   by pinning structures in 3D and on two histology slides (FR-A6, FR-H3).
3. Sets 60 s per station, randomised order, 3 attempts window, cohort "MBBS 2026 Batch A".
4. Publishes; students receive push/LMS notification (LTI).
5. During exam: live monitor shows completion; after: auto-scored (synonym-aware), item
   analysis, exports CSV, flags one ambiguous item and voids it.
6. Analytics: cohort heatmap by region; assigns remediation lesson to 22 students (FR-An2).
Failure: item reuse leaks answers (randomise + bank size warning); scoring rejects valid
synonym (synonym table + manual override); exam on flaky network (offline-capable exam
runner with signed submissions).

## J3 · Arjun studies the cardiac cycle (school mode)
1. School mode home → "Heart" → simplified record; then "Run cardiac cycle" (FR-P1).
2. Adjusts heart rate; Wiggers diagram and 3D heart valves animate in sync.
3. Asks tutor "why does the mitral valve close?" → RAG answer cites the physiology record
   and simulation notes; in school register (FR-T1, T3).
4. Takes a 5-question quiz; streak updated.

## J4 · Dr. Rahul correlates CT with 3D (postgraduate mode)
1. Radiology → "Abdomen CT (TotalSegmentator case 0421)" → scrolls axial slices (FR-R1).
2. Taps the pancreas mask → 3D view centres on the pancreas with neighbours faded; record
   opens in postgraduate mode with surgical relevance and references (FR-R2, FR-K1).
3. Toggles coronal, drops a clipping plane on the 3D model at the same level (FR-E7).
4. Bookmarks the case for teaching; creates a viva question set from it (FR-A3).

## J5 · Institution onboarding (Prof. Sharma, Anita)
1. Contract signed → tenant created with plan, seats, departments (FR-Te1).
2. Anita configures SAML with college IdP; uploads roster CSV or connects LTI 1.3 to Moodle.
3. Branding: logo, colours, name, custom domain `anatomy.college.edu.in` (A-10).
4. Faculty invited; content overlay enabled for local clinical cases (FR-K5).
5. Admin dashboard shows activation within 48 h; kickoff webinar scheduled.

## J6 · Content reviewer approves a record (Phase E)
1. Queue sorted by "published structures without approved record".
2. Opens record; each field shows citation chips; clicking opens source excerpt.
3. Requests change on "Blood supply" (missing citation) → author notified.
4. Author fixes; reviewer approves → version 3 published; version 2 retained.

## J7 · Low-bandwidth exam day
1. Student on 2G-equivalent connection toggles low-bandwidth mode (FR-E14).
2. Spotter loads item images at reduced resolution; 3D stations use LOD2 only.
3. Answers are stored locally, signed, and uploaded when connectivity returns; exam timer is
   server-authoritative with tolerance.
