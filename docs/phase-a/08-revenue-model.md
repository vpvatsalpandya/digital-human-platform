# A-08 · Revenue Model

## 1. Revenue streams

| Stream | Unit | Price band (planning) | Share at month 36 |
|---|---|---|---|
| Institutional subscription (core) | Per enrolled seat per year, tiered by institution type and country band | India: ₹350–800 (USD 4–10); SEA/MEA: USD 8–15; UK/EU/ANZ: USD 18–35; US: USD 30–45 | 65% |
| Department licence | Flat per department per year (Anatomy dept. only, up to N seats) | India ₹2.5–6 lakh; global USD 8–25k | 10% |
| White-label / enterprise | Platform fee + per-seat | USD 25–120k/yr platform fee + seats | 10% |
| Assessment add-on | Per exam-seat or bundled in Pro | ₹40–80 per exam-seat; bundled in Pro/Enterprise | 5% |
| Direct-to-student (exam prep) | Monthly / annual | India ₹199/mo, ₹1,499/yr; global USD 6.99/mo | 7% |
| Content services | Custom modules, regional cases, translations | Project-based | 3% |

## 2. Pricing principles
- **Seat = enrolled learner**, not concurrent user; faculty seats free up to 10% of learner seats.
- **Country bands** (A: India/South Asia, B: SEA/MEA/Africa/LatAm, C: UK/EU/ANZ, D: US/Canada)
  set list prices; discounts by commitment length (1/3/5 years) and by volume.
- **Plans** (A-09): Starter (atlas + knowledge + quiz), Pro (+ all modules + assessment +
  analytics), Enterprise (+ white-label, SSO, LTI, data residency, SLA, API).
- Floor price protects unit economics: hosting + AI cost per active seat ≈ USD 0.60/yr at
  scale (CDN-heavy assets, RAG calls capped per seat); content amortisation is the real cost.

## 3. Unit economics (India, Pro plan, medical college with 750 seats at ₹600)

| Item | Amount (₹/yr) |
|---|---|
| Revenue | 450,000 |
| Hosting, CDN, AI (₹50/seat) | 37,500 |
| Support and success (₹40/seat) | 30,000 |
| Payment and taxes handling (2%) | 9,000 |
| Gross margin | ≈ 83% |
| CAC (direct sales, blended) | 150,000 (payback ≈ 5 months at 83% GM) |

## 4. 36-month plan (USD, rounded)

| | Y1 | Y2 | Y3 |
|---|---|---|---|
| Institutions (cum.) | 15 | 80 | 250 |
| Avg contract value | 20k | 25k | 30k |
| Institutional ARR | 0.3M | 2.0M | 7.5M |
| B2C + other | 0.1M | 0.5M | 1.5M |
| **Total ARR** | **0.4M** | **2.5M** | **9M** |
| Content spend | 0.35M | 0.6M | 0.9M |
| Engineering (FTE) | 8 | 14 | 22 |

Assumptions: 85% logo retention, 110% net revenue retention (seat growth, plan upgrades), sales
cycle 4 months India / 9 months global.

## 5. Why not per-download or perpetual licences
Considered: perpetual site licences (incumbents' legacy model). Rejected: our value grows with
content and analytics over time; perpetual pricing starves content investment and breaks
multi-tenant benchmarking. Trade-off: some public universities can only spend capital budget;
we offer a 3-year prepaid "capital-friendly" invoice for those.

## 6. Risks
- Seat counting disputes → enrolment attestation in the contract + usage reports.
- Currency volatility on band A pricing → annual re-rating clause.
- AI cost spikes → per-seat monthly RAG quota with tenant-level top-up.
