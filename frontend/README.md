# JEEVANsetu — Frontend

React 19 + Vite + Tailwind CSS frontend for the JEEVANsetu healthcare
operations platform. See the [root README](../README.md) for the full
project overview, architecture, and setup instructions — this file covers
frontend-specific details only.

## Structure

```
src/
  components/ui/     Shared design-system primitives (Badge, Card, StatCard, Button, States)
  components/         Feature components (CityMap, NotificationCenter, GuidedTour)
  constants/enums.js   Mirrors backend/src/constants/enums.js — status vocabulary + tone metadata
  layouts/             AppLayout, Sidebar, Topbar
  lib/socket.js        Socket.IO client wrapper
  pages/               One file per route
  services/api.js      Axios instance, auth token handling, silent refresh, all API service objects
  utils/AuthContext.jsx    JWT-based auth state
  utils/hospitalStore.jsx  Shared beds/doctors/inventory state + realtime subscriptions
  utils/notificationStore.jsx  Toast + notification center state
  utils/eventBus.js    Lightweight pub/sub so any page can trigger a notification
```

## Design system

- **Palette:** `brand` (clinical teal) and `surface` (cool slate) scales in
  `tailwind.config.js`, plus semantic `status.*` tokens (success/warning/critical/info)
  used consistently by every `Badge`/`StatCard`/chart in the app.
- **Icons:** [lucide-react](https://lucide.dev) throughout — no emoji-as-icon.
- **Components:** build new UI from `components/ui/` primitives rather than
  one-off styled `<div>`s, so a palette or spacing change propagates everywhere.

## Commands

```bash
npm run dev       # start dev server on :5173 (proxies /api and /socket.io to :5000)
npm run build     # production build to dist/
npm run lint      # ESLint (includes React Compiler's stricter hooks rules)
npm run preview   # preview the production build locally
```
