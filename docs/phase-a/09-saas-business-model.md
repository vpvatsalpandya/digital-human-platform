# A-09 · SaaS Business Model

## 1. Plans and entitlements

| Capability | Starter | Pro | Enterprise |
|---|---|---|---|
| Atlas (male/female, 14 systems) | ✓ | ✓ | ✓ |
| Knowledge records (published) | ✓ | ✓ | ✓ |
| Quiz engine | ✓ | ✓ | ✓ |
| Physiology, histology, embryology, pathology, radiology | — | ✓ | ✓ |
| Spotter, practical, viva, OSPE, OSCE | — | ✓ | ✓ |
| Faculty authoring, item bank | Limited | ✓ | ✓ |
| Analytics (student/faculty) | Basic | ✓ | ✓ |
| Admin benchmarking | — | ✓ | ✓ + cross-institution |
| AI tutor quota / seat / month | 30 | 150 | Custom |
| SSO (SAML/OIDC), LTI 1.3 | — | OIDC | ✓ |
| White-label branding, custom domain | — | Logo + colours | Full (A-10) |
| Tenant content overlays | — | ✓ | ✓ |
| Data residency, SLA 99.9%, audit logs, API | — | — | ✓ |
| Offline exam runner | — | ✓ | ✓ |

Entitlements are a per-tenant JSON (`Tenant.entitlements`) evaluated server-side by a single
`can(tenant, feature)` function (Phase C). Plans are templates over entitlements; sales can
grant exceptions without code.

## 2. Tenancy model
- **Hierarchy:** Organisation (university group) → Tenant (institution) → Department → Cohort.
- **Isolation:** one PostgreSQL cluster per region; shared schema with `tenantId` on every
  tenant-owned table and Postgres RLS enforced via `SET LOCAL app.tenant_id` per request
  (Phase D). Enterprise tenants with residency requirements get a dedicated database in the
  chosen region using the same schema; the app resolves the connection by tenant.
- **Global content** (structures, records, assets) has no tenant and is read-only for tenants;
  overlays live in tenant space.

## 3. Customer lifecycle
1. Lead (inbound demo, conference, referral, reseller) → 2. Pilot (one department, 90 days,
   free or nominal, with success criteria) → 3. Contract → 4. Onboarding (SSO, roster,
   branding, faculty training: 2 weeks) → 5. Adoption (first assessment within 30 days is the
   leading indicator) → 6. Quarterly business review with dashboards → 7. Renewal 90 days
   before term.

## 4. Metrics we run the business on
- Activation: % of seats with a session in first 30 days (target > 60%).
- Depth: median structures viewed per active learner per week; % cohorts with ≥ 1 assessment
  per month.
- Content health: % published records with review age < 12 months; error reports per 1,000
  record views.
- Retention: logo and net revenue retention; renewal pipeline coverage.
- Cost: infra + AI cost per active seat; support tickets per 1,000 seats.

## 5. Support and success
- Tiered support: community/docs (Starter), email 24 h (Pro), named CSM + 4 h (Enterprise).
- In-product help, guided tours, faculty certification course (free) — faculty champions drive
  renewals.

## 6. Compliance and trust
- DPDP Act 2023 (India), GDPR, FERPA-aligned processing; DPA template; sub-processor list.
- Accessibility statement (WCAG 2.2 AA), VPAT for US buyers.
- Security: SOC 2 Type II by month 18; ISO 27001 by month 30; annual pen test.
- Medical disclaimer on every screen footer: educational use only.

## 7. Alternatives considered
- **Per-tenant deployments for everyone** (BioDigital-style enterprise): rejected for cost;
  offered only at Enterprise tier.
- **Marketplace for third-party content**: deferred to year 2; review workflow must mature
  first, otherwise it becomes a channel for unreviewed content.
