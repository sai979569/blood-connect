
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import pushRoutes from './routes/pushRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

const app = express();

// --------------------------------------------------
// CORS CONFIGURATION
// --------------------------------------------------

export const isOriginAllowed = (origin) => {
  // Allow requests with no origin (e.g. server-to-server, curl, uptime monitors)
  if (!origin) return true;

  const cleanOrigin = origin.trim().replace(/\/$/, '');

  // Allow local development on any port
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) return true;

  // Allow all Vercel domains (production & preview deployments)
  if (/^https:\/\/.*\.vercel\.app$/.test(cleanOrigin)) return true;

  // Allow explicit production domains
  if (cleanOrigin === 'https://blood-connect-two-weld.vercel.app') return true;

  // Allow configured CLIENT_ORIGIN from Render environment
  if (process.env.CLIENT_ORIGIN) {
    const configuredClean = process.env.CLIENT_ORIGIN.trim().replace(/\/$/, '');
    if (cleanOrigin === configuredClean) return true;
  }

  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    console.warn(`[CORS] Blocked unauthorized origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// --------------------------------------------------
// SECURITY AND REQUEST MIDDLEWARE
// --------------------------------------------------

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// --------------------------------------------------
// HEALTH CHECK & ROOT STATUS
// --------------------------------------------------

app.get(['/', '/health', '/api/v1/health'], (req, res) => {
  const dbState = mongoose.connection.readyState;

  const dbStatus =
    ['disconnected', 'connected', 'connecting', 'disconnecting'][
    dbState
    ] || 'unknown';

  return res.status(200).json({
    status: 'ok',
    service: 'Blood Connect API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
});

// --------------------------------------------------
// API ROUTES
// --------------------------------------------------

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/requests', requestRoutes);
app.use('/api/v1/matches', matchRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/push-subscriptions', pushRoutes);
app.use('/api/v1/admin', adminRoutes);

// --------------------------------------------------
// SERVE FRONTEND WHEN A PRODUCTION BUILD EXISTS
// --------------------------------------------------

if (
  process.env.NODE_ENV === 'production' &&
  fs.existsSync(clientDistPath)
) {
  app.use(express.static(clientDistPath));

  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }

    return res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// --------------------------------------------------
// 404 HANDLER
// --------------------------------------------------

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// --------------------------------------------------
// CENTRALIZED ERROR HANDLER
// --------------------------------------------------

app.use(errorHandler);

export default app;
