# JEEVANsetu — Healthcare Operations Intelligence Platform

JEEVANsetu is a multi-city hospital operations platform: OPD queue management,
bed allocation, doctor workload, inventory, and a live "stress score" that
models how loaded a hospital is — plus an explainable Smart Admission
decision engine, historical trend analytics, and real-time updates across
every connected client.

This is a portfolio project. It is **not** a generic hospital CRUD app — the
goal is to demonstrate full-stack engineering (React, Node/Express, MongoDB,
real-time systems, RBAC, explainable decision logic) around a coherent
healthcare-operations domain.

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
frontend/          React 19 + Vite + Tailwind — Vercel-deployable static build
backend/            Node/Express + MongoDB (Mongoose) — REST API + Socket.IO
  src/
    constants/      Shared enum vocabulary (single source of truth for every status field)
    models/          Mongoose schemas
    routes/          Express route handlers (thin — delegate to utils/)
    middleware/      auth (JWT/RBAC), csrf, rateLimiter
    utils/           scoring, hospitalMetrics, admissionEngine, forecast, snapshotJob, audit, jwt
    realtime/        Socket.IO setup + room-scoped emit helpers
  tests/             Jest unit tests (pure logic — scoring, forecast, jwt)
```

**Why a shared `constants/enums.js`:** the original version of this project had
each frontend page invent its own status strings (`'Occupied'` vs the
backend's `'occupied'`), which silently broke several features. Both
`backend/src/constants/enums.js` and `frontend/src/constants/enums.js` are now
the single source of truth for every status vocabulary in the app.

---

## Features

### Core operations
- **Multi-hospital, multi-city model** — hospitals across Delhi, Mumbai, and Bangalore, each with independent beds, doctors, OPD queue, and inventory.
- **OPD queue** — severity-based triage, auto-generated tokens, estimated wait times.
- **Bed management** — per-type (ICU/General/Emergency) capacity tracking with available/occupied/cleaning transitions.
- **Doctor roster** — department, shift, workload, and availability status.
- **Inventory tracking** — category-based stock with automatic low/critical thresholds.

### Intelligence layer
- **Stress score** — an explainable weighted formula (40% OPD load, 40% bed occupancy, 20% doctor pressure), computed identically everywhere it's shown.
- **Smart Admissions** — evaluates a patient against a hospital's *current* bed availability, doctor availability, and stress score, and recommends **admit / monitor / refer** with plain-English reasons. Computed and persisted server-side (never trusted from the client), and cross-references sibling hospitals in the same city for referral suggestions.
- **Historical trend charts** — a `MetricSnapshot` is recorded automatically for every hospital on an interval; the dashboard charts stress score over the last 24 hours from real recorded data (seeded with 24h of synthetic history so charts aren't empty on first run).
- **Forecasting** — a transparent linear-regression trend model (not a black-box ML model) projects bed-shortage and rising-stress ETAs from recent snapshots. Every number is explainable in one sentence.
- **Audit log** — every mutation (bed transition, doctor status change, inventory adjustment, admission decision) is recorded with actor, role, and timestamp.
- **Real-time updates** — Socket.IO broadcasts changes to every connected client watching a hospital, so two people looking at the same dashboard see the same live state.

### Platform
- **Real authentication** — JWT access tokens (short-lived, sent in-memory, never in localStorage) + httpOnly refresh-token cookie, with silent re-auth on page load.
- **RBAC** — four roles (`admin`, `doctor`, `staff`, `city_admin`), enforced **server-side** via middleware (client-side route gating is UX only, not the security boundary).
- **CSRF protection** — double-submit cookie pattern, applied globally so it actually works on a fresh session (see Known limitations below for what this fixed).

---

## Demo accounts

All seeded accounts share one password: **`Demo@1234`** (or whatever you set `SEED_DEMO_PASSWORD` to in `backend/.env`). The login page has one-click demo buttons for these:

| Role | Email | Scope |
|---|---|---|
| Hospital Admin | `admin@apollo.in` | Full control of Apollo (Delhi) |
| Doctor | `doctor@hinduja.in` | OPD, doctors, admissions at Hinduja (Mumbai) |
| Operations Staff | `opd@apollo.in` | Beds & inventory at Apollo |
| City Admin | `cityadmin@jeevansetu.in` | Read-only, all hospitals in Delhi |

---

## Getting started

### Prerequisites
- Node.js 20+
- A MongoDB instance (local `mongod` or MongoDB Atlas)

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

Open `http://localhost:5173` and sign in with any demo account above.

### 3. Run tests
```bash
cd backend && npm test      # 18 Jest unit tests: scoring, forecast, jwt
cd frontend && npm run lint && npm run build
```

---

## Deployment notes

- `vercel.json` targets Vercel's multi-service config (frontend + backend as
  separate serverless deployments under one project). **Socket.IO needs a
  persistent process** to hold WebSocket connections open — Vercel's
  serverless functions are not a good fit for this. For the realtime and
  scheduled-snapshot features to work in production, deploy the backend to a
  persistent Node host (Render, Railway, Fly.io, a plain VM) instead, and set
  `ENABLE_HTTP_SERVER=true` / `ENABLE_SNAPSHOT_SCHEDULER=true`. The frontend
  degrades gracefully (falls back to fetched-on-load data, no live badge) if
  it can't establish a socket connection.
- Set real, random values for `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` in
  any non-local environment.
- CI (`.github/workflows/ci.yml`) runs backend tests and a frontend
  lint+build on every push/PR.

---

## Known limitations (documented honestly, not hidden)

- **No DB integration tests.** The sandboxed environment this was built in
  couldn't reach a MongoDB download server, so test coverage is limited to
  pure-logic unit tests (scoring, forecast, JWT). Route-level integration
  tests (Supertest + a real or in-memory Mongo) are a natural next step.
- **Rate limiting is in-memory**, so it resets per-instance and won't
  coordinate across multiple server processes. Fine for a single-instance
  deployment; would need a Redis-backed store (e.g. `rate-limit-redis`) to
  scale horizontally.
- **City lookup by name/cityId** assumes exactly the three seeded cities.
  A real product would have a `/cities` collection and endpoint rather than
  a hardcoded list in the signup form.
- **Socket.IO + serverless** — see Deployment notes above.
- **Admission confirmations use a real MongoDB transaction when the
  connection is a replica set** (every Atlas cluster, including the free M0
  tier, qualifies). Against a standalone local `mongod` with no replica set,
  transactions aren't supported at all — `utils/transaction.js` detects that
  specific failure and falls back to sequential (non-atomic) writes so local
  dev still works, just without the all-or-nothing guarantee. Documented in
  code rather than silently swallowed.

---

## What changed from the original version

This started as an earlier project with real strengths (a well-modeled
stress-score algorithm, a genuinely nice CityMap/Leaflet integration, solid
route-level validation) but also real problems: no real authentication
despite `bcryptjs`/`jsonwebtoken` being installed, several pages silently
running on local mock data instead of the real API, a status-vocabulary
mismatch that made the Smart Admissions feature always return "Low risk", a
CSRF cookie that was never actually primed, and a generic indigo/purple UI.

This version replaces the auth layer, fixes every data-wiring bug, adds
real-time updates, historical analytics, explainable forecasting, an audit
trail, and a redesigned visual identity built around a clinical teal/slate
palette instead of a generic SaaS gradient.

### Refinement pass — fixes from manual QA across all four roles

A full manual pass (testing locally against MongoDB Atlas, exercising every
role) surfaced a further round of real, root-caused fixes:

- **City Admin's "City Ops" was completely broken.** `cityService.get()` only
  ever sent its argument as `?city=`, so a city_admin's `cityId` (e.g.
  `"city1"`) was compared against the `Hospital.city` *name* field and never
  matched anything. Fixed by sending `city` and `cityId` as distinct,
  named params.
- **Forecast could show an operationally useless "~8385.7h" (349 days).**
  The slope-magnitude threshold used to decide "is this trend real" was
  looser than the one used to *label* the trend, so a barely-declining slope
  could still produce a giant extrapolated ETA. Fixed with one consistent
  threshold, a 14-day forecast horizon (beyond which it now says "not
  projected to cause a shortage" instead of guessing), and human-readable
  day/week formatting on the frontend. Covered by two new regression tests.
- **A real cross-hospital data leak.** Every GET endpoint (beds, doctors,
  inventory, OPD, dashboard, forecast, admissions) accepted any `hospitalId`
  with no check that it belonged to the requesting user — only *writes* were
  hospital-scoped. Added a `requireHospitalAccess` middleware enforced
  server-side (admin/doctor/staff locked to their own hospital; city_admin
  validated against their assigned city) so this can't be bypassed by
  calling the API directly.
- **OPD wait times were a flat per-severity constant**, never updated after
  registration. Replaced with `utils/opdWaitTimes.js`, which recomputes every
  waiting patient's estimate from their actual position in the priority
  queue after every registration, status change, or cancellation.
- Surge-mode's "Recommended Hospital" reason text went stale (kept quoting
  the pre-surge score); the City hospital grid awkwardly orphaned a 4th card
  on desktop; Inventory's "Low Stock: 0" next to "Critical: 4" read as
  contradictory even though the tiers are correctly mutually exclusive;
  Admissions didn't distinguish a live recommendation from an already-
  confirmed decision. All fixed — see the CHANGELOG-equivalent detail in the
  PR/commit history for the full list.
- Added a shared, keyboard-accessible `Modal` (Escape to close, focus-on-open)
  used by every "Add ___" form; added search/filter controls to OPD, Doctors,
  and Inventory; added real before/after values to audit log entries plus
  filtering and pagination on the Activity Log.

---

## Tech stack

**Frontend:** React 19, Vite, Tailwind CSS, React Router 7, Recharts, Leaflet/react-leaflet, lucide-react, Socket.IO client, Axios
**Backend:** Node.js, Express, MongoDB/Mongoose, Socket.IO, JWT (jsonwebtoken), bcryptjs, Zod, Jest/Supertest
