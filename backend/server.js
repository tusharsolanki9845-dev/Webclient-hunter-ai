'use strict';

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const leadsRoutes = require('./routes/leads.routes');
const auditRoutes = require('./routes/audit.routes');
const outreachRoutes = require('./routes/outreach.routes');
const discoveryRoutes = require('./routes/discovery.routes');
const { errorHandler } = require('./middleware/error.middleware');

const app = express();
const PORT = Number(process.env.PORT || 3001);
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)
  .filter(origin => origin !== '*');

app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (!isProduction) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

const createLimiter = (max, message) => rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: message },
});

app.use('/api', createLimiter(Number(process.env.RATE_LIMIT_MAX_REQUESTS || 100), 'Too many requests. Please try again later.'));
app.use('/api/auth', createLimiter(Number(process.env.AUTH_RATE_LIMIT_MAX || 20), 'Too many authentication attempts. Please try again later.'));
app.use('/api/audit', createLimiter(Number(process.env.AUDIT_RATE_LIMIT_MAX || 20), 'Too many audit requests. Please try again later.'));
app.use('/api/outreach', createLimiter(Number(process.env.OUTREACH_RATE_LIMIT_MAX || 10), 'Too many AI generation requests. Please try again later.'));
app.use('/api/discovery', createLimiter(Number(process.env.DISCOVERY_RATE_LIMIT_MAX || 8), 'Too many free business searches. Please wait a few minutes and try again.'));

if (process.env.NODE_ENV !== 'test') app.use(morgan(isProduction ? 'combined' : 'dev'));

app.get('/health', (_req, res) => res.json({
  status: 'ok',
  version: '2.1.0',
  environment: process.env.NODE_ENV || 'development',
  timestamp: new Date().toISOString(),
}));

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/outreach', outreachRoutes);
app.use('/api/discovery', discoveryRoutes);

app.use((req, res) => res.status(404).json({ error: `${req.method} ${req.path} not found.` }));
app.use(errorHandler);

function startServer(port = PORT) {
  return app.listen(port, () => {
    console.log(`WebClient Hunter AI API listening on port ${port}`);
  });
}

if (require.main === module) startServer();

module.exports = { app, startServer };
