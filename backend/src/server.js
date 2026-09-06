require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/authRoutes');
const opdRoutes = require('./routes/opdRoutes');
const bedRoutes = require('./routes/bedRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const cityRoutes = require('./routes/cityRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const hospitalRoutes = require('./routes/hospitalRoutes');
const admissionRoutes = require('./routes/admissionRoutes');
const forecastRoutes = require('./routes/forecastRoutes');
const auditRoutes = require('./routes/auditRoutes');

const csrf = require('./middleware/csrf');
const connectDB = require('./utils/mongodb');
const seedData = require('./utils/seed');
const { startSnapshotScheduler } = require('./utils/snapshotJob');
const { initSocket } = require('./realtime/socket');
const { log, errorLog } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// ── DB + one-time seed + snapshot scheduler (long-running process only) ────
connectDB()
  .then(async () => {
    await seedData();
    if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SNAPSHOT_SCHEDULER === 'true') {
      // Persistent-process trend recorder. On serverless platforms without a
      // background worker, trigger utils/snapshotJob.takeSnapshots() from a
      // scheduled function instead (see README → Deployment notes).
      startSnapshotScheduler();
    }
  })
  .catch((err) => {
    errorLog('BOOT', 'Failed to connect to MongoDB', err);
  });

// ── Core middleware ──────────────────────────────────────────────────────
const corsOptions = {
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
};

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use((req, _res, next) => {
  req.requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  next();
});
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());
// Global CSRF: primes the cookie on every safe (GET) request and validates it
// on every mutating request — applying it once here (rather than per-route)
// guarantees the cookie actually exists before the frontend's first write,
// which per-route application previously did not guarantee.
app.use(csrf);

// ── Routes (no /api prefix — Vercel's rewrite adds it) ──────────────────
app.use('/auth', authRoutes);
app.use('/opd', opdRoutes);
app.use('/beds', bedRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/city', cityRoutes);
app.use('/doctors', doctorRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/hospitals', hospitalRoutes);
app.use('/admissions', admissionRoutes);
app.use('/forecast', forecastRoutes);
app.use('/audit', auditRoutes);

app.get('/health', async (_, res) => {
  const mongoose = require('mongoose');
  res.json({
    status: 'ok',
    service: 'JEEVANsetu API',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.use((_, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
  errorLog('REQUEST', `${req.method} ${req.originalUrl}`, err);
  res.status(err.status || 500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message,
  });
});

// ── Local / persistent-host boot (Socket.IO needs a real HTTP server) ──────
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_HTTP_SERVER === 'true') {
  const httpServer = http.createServer(app);
  initSocket(httpServer, corsOptions);
  httpServer.listen(PORT, () => {
    log('BOOT', `JEEVANsetu API + realtime running on port ${PORT}`);
  });
}

module.exports = app;
