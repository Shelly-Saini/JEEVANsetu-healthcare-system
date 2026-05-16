require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const opdRoutes = require('./routes/opdRoutes');
const bedRoutes = require('./routes/bedRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const cityRoutes = require('./routes/cityRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const hospitalRoutes = require('./routes/hospitalRoutes');

const connectDB = require('./utils/mongodb');
const seedData = require('./utils/seed');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect DB
connectDB()
  .then(() => {
    seedData();
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
  });

// Middleware
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

// Routes (NO /api here because Vercel adds it)
app.use('/opd', opdRoutes);
app.use('/beds', bedRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/city', cityRoutes);
app.use('/doctors', doctorRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/hospitals', hospitalRoutes);

// Health
app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    service: 'JEEVANsetu API',
  });
});

// 404
app.use((_, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message,
  });
});

// Local only
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`JEEVANsetu API running on port ${PORT}`);
  });
}

module.exports = app;