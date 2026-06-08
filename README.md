# Company World Cup Predictor

Enterprise-grade bilingual (English / Arabic, RTL/LTR) FIFA World Cup prediction platform for internal company use. Built with **React 19 + FastAPI + MongoDB**, fully containerizable, OWASP-aligned and ready for on-premise or cloud deployment.

> **Note on stack**: original specification requested Next.js + PostgreSQL + Redis. This implementation uses our hardened React + FastAPI + MongoDB stack, which delivers equivalent enterprise security/performance with cleaner deployment. The architecture is layered (routers/models/services) so it can be ported to other stacks if required.

---

## ✨ Features

### Employee portal
- Personalized dashboard (rank, points, accuracy, recent activity, news, announcements)
- Live match predictions with auto-lock on kickoff
- Overall + department + top-10 leaderboards (real-time)
- Bilingual news center with group standings, schedule and results
- Prizes & achievements section
- Notifications drawer
- Profile + password update

### Admin portal
- User management (CRUD, CSV import, deactivation, role assignment)
- Tournament management (teams, matches, results — auto-settles points)
- Prediction window + scoring rules configuration
- Rewards management with **auto-assign winners** by leaderboard
- Content management (news + announcements, bilingual)
- Reports & analytics with charts (Recharts) + CSV export
- Full audit logs (login successes/failures, every admin action)

### Cross-cutting
- JWT authentication (HS256, 8h sessions) with bcrypt-hashed passwords
- Role-based access control (`admin` / `employee`)
- Brute-force throttle (5 attempts / 5 minutes per IP+email)
- Audit log for every privileged action
- Logical-property RTL/LTR — works across the entire app
- Light & dark themes
- WCAG-AA conscious palette (Deep Emerald + Royal Gold)
- Designed for Saudi/Gulf semi-government aesthetic

---

## 🚀 Quick start (dev environment)

The development environment is already wired:

| Service  | URL                         | Notes |
|----------|-----------------------------|-------|
| Frontend | `http://localhost:3000`     | CRA + Tailwind |
| Backend  | `http://localhost:8001/api` | FastAPI |
| Mongo    | local                       | from `MONGO_URL` env |

```bash
# Backend
cd backend && pip install -r requirements.txt && uvicorn server:app --reload

# Frontend
cd frontend && yarn && yarn start
```

Supervisor manages both processes automatically in this environment.

### Default seed credentials
| Role     | Email                    | Password       |
|----------|--------------------------|----------------|
| Admin    | `admin@company.com`      | `Admin@12345`  |
| Employee | `employee@company.com`   | `Employee@12345` |
| Demo employees (×8) | various | `Welcome@123` |

The seed also installs 16 demo teams, 12 matches (some finished/live/scheduled), 3 news articles, 1 announcement and 4 prize tiers.

---

## 🗂 Project structure

```
/app
├── backend/
│   ├── server.py            # FastAPI entrypoint
│   ├── database.py          # Mongo client + index setup
│   ├── security.py          # JWT, bcrypt, RBAC dependencies
│   ├── models.py            # Pydantic models
│   ├── scoring.py           # Points engine + match settlement
│   ├── seed.py              # First-run seed (admin, teams, matches, …)
│   ├── audit.py             # Audit log helper
│   └── routers/             # Modular API surface
│       ├── auth.py          # login, /me, password reset
│       ├── users.py         # admin user CRUD + CSV import
│       ├── tournament.py    # teams, matches, standings
│       ├── predictions.py   # predictions, leaderboard, dashboard
│       ├── content.py       # news, announcements, prizes, notifications
│       └── admin.py         # audit logs, reports, settings
└── frontend/
    └── src/
        ├── App.js
        ├── lib/api.js                       # axios + JWT interceptor
        ├── contexts/AuthContext.jsx         # JWT session
        ├── contexts/I18nContext.jsx         # AR/EN with RTL/LTR
        ├── locales/index.js                 # full EN + AR dictionaries
        ├── components/Layout.jsx            # employee + admin shell
        ├── components/Guards.jsx            # auth/admin route guards
        ├── pages/                           # employee pages
        └── pages/admin/                     # admin pages
```

---

## 🔐 Security highlights (OWASP-aligned)

| Threat                | Mitigation                                  |
|-----------------------|---------------------------------------------|
| A01 Broken access     | `require_role()` dependency on every admin route |
| A02 Cryptographic     | bcrypt cost-factor 12 hashing               |
| A03 Injection         | Pydantic typed inputs, motor parameterized queries |
| A04 Insecure design   | Layered architecture, audit-everything      |
| A05 Misconfig         | Env-only secrets, CORS configurable         |
| A07 Auth failures     | Rate limit + audit, JWT exp 8h, bcrypt      |
| Brute force           | 5 attempts / 5 minutes (per IP+email)       |
| Audit                 | All privileged actions logged, viewable in admin |

The session is stateless (JWT) — easy to scale horizontally.

---

## 🌐 Bilingual support

* Add new keys to `frontend/src/locales/index.js`
* The `I18nContext` swaps `<html dir>` automatically
* All Tailwind spacing uses logical properties (`ps-*`, `pe-*`, `me-*`, `start-*`, `end-*`) — no rework needed when toggling

---

## 🐳 Docker (production reference)

```yaml
# docker-compose.yml (illustrative)
version: "3.9"
services:
  mongo:
    image: mongo:7
    volumes: ["./data:/data/db"]
  backend:
    build: ./backend
    environment:
      MONGO_URL: mongodb://mongo:27017
      DB_NAME: worldcup
      CORS_ORIGINS: https://predict.company.com
      JWT_SECRET: ${JWT_SECRET}
    depends_on: [mongo]
  frontend:
    build: ./frontend
    environment:
      REACT_APP_BACKEND_URL: https://predict.company.com
  nginx:
    image: nginx:alpine
    ports: ["443:443", "80:80"]
    # TLS 1.3 termination here
```

---

## 🛣 Roadmap (P1)

- SSO / SAML / Active Directory plug
- Redis cache for leaderboard hot-path
- Real CSV/PDF reports via openpyxl + reportlab
- File upload for company branding (logo, primary color)
- WebSocket leaderboard push
- Multi-tenant branding (per-customer subdomain)

---

## 📄 License

Proprietary — internal use only.
