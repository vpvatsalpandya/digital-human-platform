# A-10 · White-Label Strategy

## 1. What "white-label" means here
An institution (or reseller) can present the platform as its own product: name, logo,
colours, typography, domain, email sender, login page, certificates, and optionally hide the
Vesalia brand entirely — while running on the shared multi-tenant platform (or a dedicated
Enterprise instance).

## 2. Layers of customisation

| Layer | Mechanism | Who edits | Cache/propagation |
|---|---|---|---|
| Identity: product name, logo, favicon, PWA manifest | `TenantBranding` row; manifest generated per domain | Tenant admin | Edge-cached by host, purged on save |
| Theme: colour tokens, radius, font | Design tokens → CSS variables injected at layout; Tailwind uses `var(--color-*)` | Tenant admin (guard-railed palette with contrast checks) | Same |
| Domain: `anatomy.college.edu` | Custom domain table + automated TLS (Vercel domains API or cert-manager on k8s) | Tenant admin + DNS | Minutes |
| Content: local notes, cases, terminology preferences (e.g., British vs American spelling) | Tenant overlays (Phase E §6) | Faculty | Immediate |
| Curriculum mapping: NMC CBME, GMC Outcomes, custom | `CurriculumFramework` + mappings | Faculty/admin | Immediate |
| Email: sender domain, templates | Per-tenant sender with DKIM | Admin | Hours (DNS) |
| Login: SSO, welcome text, legal links | Tenant auth config | IT admin | Immediate |
| Feature visibility | Entitlements + "hide module" toggles | Admin | Immediate |
| Mobile app store presence | Capacitor wrapper build per tenant (Enterprise only) | Us | Release cycle |

## 3. What cannot be white-labelled
- The attribution page for open assets (licence obligation; A-05 §4).
- The medical-use disclaimer.
- Security and privacy notices required by law.
The contract lists these explicitly.

## 4. Reseller model
- Regional resellers (SEA, MEA, Africa, LatAm) get a **reseller organisation** that can create
  tenants, apply their own brand on the sales surface, and see aggregate usage. Margin 25–35%.
- Resellers cannot access tenant learner data; benchmarking across their tenants is anonymised.

## 5. Technical design summary (details Phase C/F)
- Host header → tenant resolution at the edge (middleware) with a Redis-cached map.
- `data-tenant` on `<html>`; theme tokens as CSS variables; no per-tenant CSS builds.
- Asset URLs are tenant-agnostic (global CDN) except branding assets.
- Server components read tenant context from request scope; never from globals.

## 6. Alternatives considered
- **Forking per client** — rejected: unmaintainable past 5 clients.
- **Theme via runtime Tailwind config** — rejected: requires per-tenant builds; CSS variables
  give 95% of the flexibility with zero build cost.
- **Per-tenant subdomain only (no custom domains)** — kept as default, custom domains at
  Enterprise because TLS automation and support cost are real.

## 7. Risks
- Brand-hidden deployments make attribution and support harder → the "About" page carries a
  "Powered by" line unless Enterprise contract removes it, and the attribution page always
  remains.
- Colour choices breaking contrast → automated WCAG contrast validation on save.
