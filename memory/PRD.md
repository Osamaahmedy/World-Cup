# Product Requirements – Company World Cup Predictor

## Original problem
Build an enterprise-grade FIFA World Cup prediction platform for internal company use. JWT auth (with future SSO/AD plug), bilingual EN/AR (RTL/LTR), employee + admin portals, predictions with auto-lock, leaderboard, news center, prizes, OWASP-aligned, On-prem/cloud capable.

## Stack (delivered)
- Backend: FastAPI + MongoDB (Motor), JWT (HS256) + bcrypt rate-limited auth
- Frontend: React 19 + CRA + Tailwind + shadcn/ui + Recharts
- i18n: custom context + dictionary (EN + AR), `<html dir>` auto-switch
- Theming: light + dark, Emerald + Royal Gold palette

## Personas
- **Employee** — predicts matches, climbs leaderboard, reads news, sees announcements
- **Admin** — manages users/tournament/predictions/rewards/content/reports/audit (NO branding access)
- **Super Admin** — everything Admin can do + exclusive Branding/Visual Identity control

## Implemented (2026-06-08) — Employee-ID auth + 3-tier RBAC
- Login changed from EMAIL to **Employee ID** (`employee_id`). Email field removed entirely from the user model, login, profile, audit and admin UI.
- New users get default password `123456` + `requires_password_change=True`; forced to set a STRONG password (8+ chars, upper, lower, number, special) on first login via /change-password (RequireAuth redirects there until cleared).
- POST /api/auth/change-password (auth) enforces strong policy + "must differ from current". Profile change-password now requires current+new password.
- 3 roles: super_admin / admin / employee. `require_role` lets super_admin pass all admin checks. Branding endpoints (GET/PUT /admin/settings/branding, /admin/branding/upload) restricted to super_admin. Frontend hides Branding sidebar item for non-super_admin; /admin/branding gated by RequireSuperAdmin.
- Admin Users page: Employee ID column (no email), create with optional password (defaults to 123456), per-row Reset-password (back to 123456 + force change), super_admin role option visible only to super admins. CSV import columns: employee_id,full_name,department,role.
- DB migration: legacy email-based users dropped + re-seeded; unique index moved email→employee_id.
- Seed users: super_admin 1000/Admin@12345, admin 1001/Admin@12345, employee 1002/123456 (force-change demo), employees 1003–1010/123456.
- Verified: backend 53/53 pytest + frontend 100% (iteration_5).

## Implemented (2026-06-03)
- Auth: login, /me, password reset, brute-force throttle, audit
- Employee: dashboard, matches (predict + lock), leaderboard (overall/dept/top10), profile, news with standings/schedule, prizes, notifications
- Admin: overview, users (CRUD + CSV import), tournament (teams/matches/results auto-settle), predictions (window + scoring), rewards (auto-assign), content (news + announcements bilingual), reports (charts + CSV), audit logs
- Bilingual EN/AR with full RTL
- Seed: 1 admin + 9 employees + 16 teams + 12 matches + 3 news + 1 announcement + 4 prizes

## Implemented (2026-06-08) — Branding v2 (iLogic identity)
- Full iLogic purple rebrand (primary #2E1065, accent lilac #C4B5FD) applied site-wide via migration (_brand_version 2).
- Brand symbol watermark on login hero + configurable in-app page backgrounds (pattern/gradient/solid/image) via Layout AppBackground.
- Admin Branding page extended: brand symbol upload, page-background style selector + background image upload. Everything editable from /admin/branding. Verified 100% (iteration_4).

## Implemented (2026-06-08)
- Admin Branding & Identity page (/admin/branding): customize logo, favicon, login hero image, full color palette (9 colors), platform name + login taglines (EN/AR), live preview, reset-to-defaults.
- Public /api/branding consumed by BrandingContext → injects CSS vars (html:not(.dark)), sets favicon + title; applies instantly site-wide.
- Image uploads via Emergent object storage (storage.py): POST /admin/branding/upload, served publicly at GET /api/branding/file/{path}. EMERGENT_LLM_KEY added to backend/.env.
- Default brand set to iLogic (logo provided by user). Login page + Layout now render branding logo/name/colors.

## Backlog (P1)
- SSO/SAML/AD integration (align with Employee-ID flow)
- Real Excel + PDF exports
- Multi-tenant branding (logo/colors/domain via DB)
- Redis hot cache for leaderboard
- WebSocket live leaderboard
- Self-service password reset (OTP/email or admin-assisted) for forgotten passwords

## Test credentials
See `/app/memory/test_credentials.md`
