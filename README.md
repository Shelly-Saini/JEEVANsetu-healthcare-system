# JEEVANsetu — Healthcare Operations Intelligence Platform

<p align="left">
  <img alt="Node" src="https://img.shields.io/badge/node-%E2%89%A520-339933?logo=node.js&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/react-19-149ECA?logo=react&logoColor=white">
  <img alt="MongoDB" src="https://img.shields.io/badge/mongodb-mongoose-47A248?logo=mongodb&logoColor=white">
  <img alt="Tests" src="https://img.shields.io/badge/tests-20%20passing-2fa84f">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue">
</p>

JEEVANsetu is a multi-city hospital operations platform: OPD queue management,
bed allocation, doctor workload, inventory, and a live **stress score** that
models how loaded a hospital is — plus an explainable Smart Admission
decision engine, historical trend analytics, and real-time updates across
every connected client.

This is a portfolio project. It is **not** a generic hospital CRUD app — the
goal is to demonstrate full-stack engineering (React, Node/Express, MongoDB,
real-time systems, RBAC, explainable decision logic) around a coherent
healthcare-operations domain.

---

## Table of contents

- [What's actually real vs. simulated](#whats-actually-real-vs-simulated)
- [Architecture](#architecture)
- [Features](#features)
- [Roles & permissions](#roles--permissions)
- [API overview](#api-overview)
- [Getting started](#getting-started)
- [Demo accounts](#demo-accounts)
- [Testing](#testing)
- [Deployment notes](#deployment-notes)
- [Known limitations](#known-limitations-documented-honestly-not-hidden)
- [Project history](#project-history)
- [Tech stack](#tech-stack)
- [License](#license)

---

## What's actually real vs. simulated

Being upfront about this, because it matters for how you read the codebase:

| | |
|---|---|
| **Real, backed by MongoDB** | Hospitals, beds, doctors, OPD queue, inventory, admissions, users, audit log, historical metric snapshots. Every number on every dashboard comes from these collections. |
| **Real, computed server-side** | Hospital stress score, city rankings, the Smart Admission decision (admit/monitor/refer), bed-shortage & stress-trend forecasts. |
| **Real, live** | Socket.IO pushes bed/doctor/OPD/inventory/admission changes to every connected client watching that hospital — no polling. |
| **Simulated, clearly labeled** | The "Simulate Surge" button on the City page — a local what-if preview that temporarily re-renders already-fetched data to show how the dashboard *would* react to a load spike. It never touches the database, and the UI labels it as such. |

---

## Architecture

```
frontend/           React 19 + Vite + Tailwind — Vercel-deployable static build
backend/             Node/Express + MongoDB (Mongoose) — REST API + Socket.IO
  src/
    constants/       Shared enum vocabulary (single source of truth for every status field)
    models/          Mongoose schemas
    routes/          Express route handlers (thin — delegate to utils/)
    middleware/      auth (JWT/RBAC), csrf, rateLimiter
    utils/           scoring, hospitalMetrics, admissionEngine, forecast, snapshotJob, audit, jwt
    realtime/        Socket.IO setup + room-scoped emit helpers
  tests/             Jest unit tests (pure logic — scoring, forecast, jwt)
scripts/             Repo-level utilities (e.g. enum sync check, used by CI)
```

**Why a shared `constants/enums.js`:** an earlier version of this project had
each frontend page invent its own status strings (`'Occupied'` vs the
backend's `'occupied'`), which silently broke several features. Both
`backend/src/constants/enums.js` and `frontend/src/constants/enums.js` are now
the single source of truth for every status vocabulary in the app, and
`scripts/check-enum-sync.js` fails CI if they ever drift apart again.

---

## Features

### Core operations
- **Multi-hospital, multi-city model** — hospitals across Delhi, Mumbai, and Bangalore, each with independent beds, doctors, OPD queue, and inventory.
- **OPD queue** — severity-based triage, auto-generated tokens, wait times recalculated live from actual queue position (not a flat constant).
- **Bed management** — per-type (ICU/General/Emergency) capacity tracking with available/occupied/cleaning transitions.
- **Doctor roster** — department, shift, workload, and availability status, with sortable/filterable views.
- **Inventory tracking** — category-based stock with automatic low/critical thresholds and restock alerts.

### Intelligence layer
- **Stress score** — an explainable weighted formula (40% OPD load, 40% bed occupancy, 20% doctor pressure), computed identically everywhere it's shown.
- **Smart Admissions** — evaluates a patient against a hospital's *current* bed availability, doctor availability, and stress score, and recommends **admit / monitor / refer** with plain-English reasons. Computed and persisted server-side (never trusted from the client), cross-references sibling hospitals in the same city for referral suggestions, and clearly separates a live *recommendation* from a *confirmed* decision.
- **Historical trend charts** — a `MetricSnapshot` is recorded automatically for every hospital on an interval; the dashboard charts stress score over the last 24 hours from real recorded data.
- **Forecasting** — a transparent linear-regression trend model (not a black-box ML model) projects bed-shortage and rising-stress ETAs from recent snapshots, capped to a 14-day horizon so it never reports a false-precision figure like "shortage in 8,385 hours."
- **Audit log** — every mutation (bed transition, doctor status change, inventory adjustment, admission decision) is recorded with actor, role, before/after values, and timestamp — filterable by resource type, actor role, and date.
- **Real-time updates** — Socket.IO broadcasts changes to every connected client watching a hospital, so two people looking at the same dashboard see the same live state.

### Platform
- **Real authentication** — JWT access tokens (short-lived, kept in memory, never in localStorage) + httpOnly refresh-token cookie, with silent re-auth on page load.
- **RBAC** — four roles, enforced **server-side** via middleware on every route, including reads (a user can't view another hospital's data just by changing an id in the request — client-side route gating is UX only, not the security boundary).
- **CSRF protection** — double-submit cookie pattern, applied globally.

---

## Roles & permissions

| | Dashboard | City Ops | OPD | Beds | Doctors | Inventory | Admissions | Activity Log |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Doctor** | ✅ | ✅ | ✅ | — | ✅ | — | ✅ | ✅ |
| **Ops Staff** | ✅ | ✅ | — | ✅ | — | ✅ | — | ✅ |
| **City Admin** | — | ✅ (city-wide, read-only) | — | — | — | — | — | ✅ (city-wide) |

Every cell above is enforced twice: the frontend hides nav items a role
shouldn't see, and the backend independently rejects the request if it
somehow arrives anyway (`requireRole`, `requireOwnHospital`, and
`requireHospitalAccess` middleware — see `backend/src/middleware/auth.js`).

---

## API overview

All routes are mounted without an `/api` prefix internally (Vercel's rewrite
adds it in production; the local Vite dev proxy does the same).

| Route | Purpose |
|---|---|
| `POST /auth/register`, `/login`, `/refresh`, `/logout`, `GET /auth/me` | JWT auth |
| `GET /hospitals` | Public hospital directory (no auth — needed for signup) |
| `GET /dashboard/:hospitalId`, `GET /dashboard/:hospitalId/history` | Hospital summary + stress-score trend |
| `GET /city?city=|cityId=` | Multi-hospital city comparison + recommended hospital |
| `GET/POST/PUT/DELETE /beds`, `/doctors`, `/inventory`, `/opd` | Resource CRUD, hospital-scoped |
| `GET /admissions/evaluate`, `POST /admissions` | Smart Admission recommend / confirm |
| `GET /forecast/:hospitalId` | Bed-shortage / stress-trend projection |
| `GET /audit` | Filterable, paginated activity log |
| `GET /health` | Liveness + DB connectivity check |

---

## Getting started

### Prerequisites
- Node.js 20+
- A MongoDB instance (local `mongod`, or a free MongoDB Atlas cluster)

### 1. Backend
```bash
cd backend
cp .env.example .env      # edit MONGODB_URI at minimum
npm install
npm run dev                # seeds the database on first boot, starts on :5000
```
The first boot seeds hospitals, users, beds, doctors, inventory, OPD entries,
admissions, and 24h of historical snapshots. Re-run with `npm run reseed:yes`
to wipe and reseed.

### 2. Frontend
```bash
cd frontend
cp .env.example .env       # defaults work with the dev proxy below
npm install
npm run dev                 # starts on :5173, proxies /api and /socket.io to :5000
```

Open `http://localhost:5173` and sign in with any demo account below.

---

## Demo accounts

All seeded accounts share one password: **`Demo@1234`** (or whatever you set
`SEED_DEMO_PASSWORD` to in `backend/.env`). The login page has one-click demo
buttons for these:

| Role | Email | Scope |
|---|---|---|
| Hospital Admin | `admin@apollo.in` | Full control of Apollo (Delhi) |
| Doctor | `doctor@hinduja.in` | OPD, doctors, admissions at Hinduja (Mumbai) |
| Operations Staff | `opd@apollo.in` | Beds & inventory at Apollo |
| City Admin | `cityadmin@jeevansetu.in` | Read-only, all hospitals in Delhi |

---

## Testing

```bash
cd backend && npm test              # 20 Jest unit tests: scoring, forecast, jwt
cd frontend && npm run lint && npm run build
node scripts/check-enum-sync.js     # fails if frontend/backend status vocab drift apart
```

All four checks above run in CI on every push/PR (`.github/workflows/ci.yml`).

---

## Known limitations (documented honestly, not hidden)

- **No DB integration tests.** Test coverage is limited to pure-logic unit
  tests (scoring, forecast, JWT). Route-level integration tests (Supertest +
  a real or in-memory Mongo) are a natural next step.
- **Rate limiting is in-memory**, so it resets per-instance and won't
  coordinate across multiple server processes. Fine for a single-instance
  deployment; would need a Redis-backed store (e.g. `rate-limit-redis`) to
  scale horizontally.
- **City lookup by name/cityId** assumes exactly the three seeded cities.
  A real product would have a `/cities` collection and endpoint rather than
  a hardcoded list in the signup form.
- **Admission confirmations use a real MongoDB transaction when the
  connection is a replica set** (every MongoDB Atlas cluster, including the
  free M0 tier, qualifies). Against a standalone local `mongod` with no
  replica set, transactions aren't supported at all — `utils/transaction.js`
  detects that specific failure and falls back to sequential (non-atomic)
  writes so local dev still works, just without the all-or-nothing guarantee.

---

## Project history

This started as an earlier project with real strengths (a well-modeled
stress-score algorithm, a genuinely nice CityMap/Leaflet integration, solid
route-level validation) but also real problems: no real authentication
despite `bcryptjs`/`jsonwebtoken` being installed, several pages silently
running on local mock data instead of the real API, a status-vocabulary
mismatch that made the Smart Admissions feature always return "Low risk," a
CSRF cookie that was never actually primed, and a generic indigo/purple UI.

It went through two major passes to reach its current state:

1. **Rebuild** — replaced the auth layer, fixed every data-wiring bug, added
   real-time updates, historical analytics, explainable forecasting, an audit
   trail, and a redesigned visual identity built around a clinical teal/slate
   palette.
2. **Manual QA pass** — testing locally against MongoDB Atlas across all four
   roles surfaced further root-caused fixes: a city-scoping bug that broke
   City Admin entirely, an operationally-useless forecast figure caused by
   inconsistent trend thresholds, a real cross-hospital **read** data leak
   (any authenticated user could view another hospital's data by changing an
   id in the request — closed with a `requireHospitalAccess` middleware),
   flat non-updating OPD wait times replaced with real queue-position-driven
   calculation, and a round of UX/accessibility polish (a shared keyboard-
   accessible modal, search/filter controls, clearer recommendation-vs-
   confirmed language in Smart Admissions).

---

## Tech stack

**Frontend:** React 19, Vite, Tailwind CSS, React Router 7, Recharts, Leaflet/react-leaflet, lucide-react, Socket.IO client, Axios
**Backend:** Node.js, Express, MongoDB/Mongoose, Socket.IO, JWT (jsonwebtoken), bcryptjs, Zod, Jest/Supertest

---

## License

MIT — see [`LICENSE`](./LICENSE). 
