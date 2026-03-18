require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');

const opdRoutes       = require('./routes/opdRoutes');
const bedRoutes       = require('./routes/bedRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const cityRoutes      = require('./routes/cityRoutes');
const doctorRoutes    = require('./routes/doctorRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/opd',       opdRoutes);
app.use('/api/beds',      bedRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/city',      cityRoutes);
app.use('/api/doctors',   doctorRoutes);
app.use('/api/inventory', inventoryRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok', service: 'JEEVANsetu API' }));

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((_, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message });
});

app.listen(PORT, () => console.log(`JEEVANsetu API running on port ${PORT}`));

module.exports = app;
