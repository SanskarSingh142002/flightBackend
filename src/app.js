const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes    = require('./routes/auth.routes');
const flightRoutes  = require('./routes/flight.routes');
const bookingRoutes = require('./routes/booking.routes');
const adminRoutes   = require('./routes/admin.routes');
const { notFound, errorHandler } = require('./middleware/error.middleware');

const app = express();

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://fareoracle.com',
  'https://www.fareoracle.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
];

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return true;
  return false;
};

app.use(cors({
  origin: (origin, cb) => {
    if (isAllowedOrigin(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ── Body parser ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logger ────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'FareOracle API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/flights',  flightRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin',    adminRoutes);

// ── Error handlers ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
