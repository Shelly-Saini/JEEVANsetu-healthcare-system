# 🏥 JEEVANsetu – AI-Powered Hospital Coordination System

> A full-stack healthcare coordination platform that reduces OPD overcrowding, improves waiting times, and provides real-time visibility into hospital resources across an entire city.

---

## 📌 Project Description

**JEEVANsetu** is a role-based, city-integrated healthcare coordination system designed to tackle the critical problem of hospital resource mismanagement. It enables intelligent decision-making through real-time analytics, simulation, and city-level hospital comparison.

The platform gives **City Admins**, **Hospital Admins**, and **OPD Desk staff** a unified view of:
- Patient queues and severity levels
- Bed availability across ICU, General, and Emergency wards
- Doctor workloads and availability
- Inventory stock levels with automated alerts
- A computed **Stress Score** per hospital to guide patient redirection

---

## ✨ Features

| Feature | Description |
|---|---|
| 🪑 OPD Queue Management | Token generation, severity-based priority, live queue display |
| 🛏️ Bed Management | ICU / General / Emergency tracking with occupancy % |
| 👨‍⚕️ Doctor Availability | Workload tracking, department-wise breakdown |
| 📊 Hospital Dashboard | Stress Score calculation with OPD, Bed & Doctor breakdown |
| 🌆 City Dashboard | Multi-hospital comparison, best hospital recommendation |
| ⚡ Simulation Mode | Surge testing — increase load without touching backend |
| 🗺️ Map Integration | Hospital locations via Leaflet + OpenStreetMap |
| 📦 Inventory Monitoring | Stock alerts (ok / low / critical) with shortage % |
| 🔄 Real-time UI | Animated counters, live stress indicators |
| 🚀 Performance | Lazy loading, code splitting, deferred map bundle |

---

## 🛠️ Tech Stack

### Frontend
- ⚛️ **React.js** — functional components, hooks
- 🎨 **Tailwind CSS** — utility-first modern UI
- 📈 **Recharts** — bar charts, data visualization
- 🗺️ **Leaflet + React-Leaflet** — interactive hospital map

### Backend
- 🟢 **Node.js** — runtime
- 🚂 **Express.js** — REST API framework
- 🔐 **JWT** — authentication ready
- 🛡️ **Helmet + CORS** — security middleware

### Database
- 🔥 **Firebase Firestore** (simulated via structured in-memory data store)

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│  Dashboard │ City View │ OPD │ Beds │ Doctors │ Inventory│
└────────────────────────┬────────────────────────────────┘
                         │ REST API (axios)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  Node.js + Express API                   │
│  /api/dashboard  /api/city  /api/opd  /api/beds          │
│  /api/doctors    /api/inventory                          │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│           In-Memory Data Store (db.js)                   │
│  hospitals │ beds │ doctors │ opdQueues │ inventory       │
└─────────────────────────────────────────────────────────┘
```

The frontend communicates with backend APIs which process hospital data and compute analytics like **Stress Scores** (40% OPD load + 40% Bed occupancy + 20% Doctor pressure).

---

## 📸 Screenshots

> *(Add screenshots after running the app)*

| Dashboard | City View |
|---|---|
| ![Dashboard](./screenshots/dashboard.png) | ![City View](./screenshots/city.png) |

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js v18+
- npm v9+

### 1. Clone the repository

```bash
git clone https://github.com/your-username/jeevansetu.git
cd jeevansetu
```

### 2. Backend Setup

```bash
cd backend
npm install
npm run dev
```

> Backend runs on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

> Frontend runs on `http://localhost:5173`

---

## ⚙️ Environment Variables

### Frontend — `frontend/.env`

```env
VITE_API_URL=http://localhost:5000/api
```

### Backend — `backend/.env`

```env
PORT=5000
JWT_SECRET=your_secret_key
NODE_ENV=development
```

---

## 📁 Project Structure

```
JEEVANsetu/
├── backend/
│   └── src/
│       ├── routes/          # opdRoutes, bedRoutes, doctorRoutes, etc.
│       ├── utils/           # db.js (data store), scoring.js
│       └── server.js        # Express app entry point
│
└── frontend/
    └── src/
        ├── components/      # CityMap, reusable UI
        ├── layouts/         # AppLayout, Sidebar, Topbar
        ├── pages/           # Dashboard, City, OPD, Beds, Doctors, Inventory
        ├── services/        # api.js (axios service layer)
        └── utils/
```

---

## 📊 Stress Score Formula

The **Hospital Stress Score** (0–100) is calculated as:

```
Stress Score = (OPD Load × 0.4) + (Bed Occupancy × 0.4) + (Doctor Pressure × 0.2)
```

| Score Range | Label | Meaning |
|---|---|---|
| 0 – 44 | 🟢 Low | Hospital operating normally |
| 45 – 74 | 🟡 Medium | Moderate load, monitor closely |
| 75 – 100 | 🔴 High | Critical — redirect patients |

---

## 🔑 Role-Based Access

| Role | Access |
|---|---|
| 🏙️ City Admin | Full city dashboard, all hospitals |
| 🏥 Hospital Admin | Single hospital dashboard, beds, doctors, inventory |
| 🪑 OPD Desk | OPD queue management only |

---

## 🟢 Current Status

- ✅ Fully functional in local environment
- ✅ All REST APIs operational
- ✅ Frontend pages complete with charts, maps, animations
- ✅ Simulation mode working
- ✅ Code splitting & lazy loading implemented
- 🔲 Authentication UI (backend-ready)
- 🔲 Cloud deployment

---

## 🔮 Future Improvements

- ☁️ Deploy on **Vercel** (frontend) + **Render** (backend)
- 🤖 AI-based hospital recommendation engine
- 🔌 Real-time updates using **WebSockets / Firebase listeners**
- 📱 Mobile-friendly responsive version
- 🔐 Full authentication flow with role-based routing
- 📧 Notification system for low stock and patient alerts

---

## 👤 Author

**[Your Name]**
- GitHub: [@your-username](https://github.com/your-username)
- LinkedIn: [your-linkedin](https://linkedin.com/in/your-linkedin)

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

---

<div align="center">
  <strong>Built with ❤️ to improve healthcare coordination across cities</strong>
</div>
