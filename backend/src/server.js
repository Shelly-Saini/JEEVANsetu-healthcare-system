require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const cookieParser = require('cookie-parser');

const opdRoutes       = require('./routes/opdRoutes');
const bedRoutes       = require('./routes/bedRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const cityRoutes      = require('./routes/cityRoutes');
const doctorRoutes    = require('./routes/doctorRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const hospitalRoutes  = require('./routes/hospitalRoutes');

const connectDB = require('./utils/mongodb');
const seedData = require('./utils/seed');

const app  = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB and seed data
connectDB().then(() => {
  seedData();
}).catch(err => {
  console.error('Failed to connect to MongoDB', err);
});

// ─── Middleware ───────────────────────────────────────────────────────────────
const corsOptions = {
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
};
app.options('*', cors(corsOptions));   // handle preflight before helmet
app.use(cors(corsOptions));
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use((req, _res, next) => { req.requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; next(); });
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/opd',       opdRoutes);
app.use('/api/beds',      bedRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/city',      cityRoutes);
app.use('/api/doctors',   doctorRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/hospitals', hospitalRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok', service: 'JEEVANsetu API' }));

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((_, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌", err.message);
  res.status(err.status || 500).json({
    success: false,
    error: "Internal Server Error",
    message: err.message,
  });
});

app.listen(PORT, () => console.log(`JEEVANsetu API running on port ${PORT}`));

module.exports = app;
