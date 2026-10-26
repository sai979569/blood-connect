
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

const allowedOrigins = [
  'https://blood-connect-two-weld.vercel.app',
  process.env.CLIENT_ORIGIN,
  'http://localhost:5173',
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests without an Origin header, such as
    // health checks, command-line tools, and server-to-server calls.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
  ],
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
// HEALTH CHECK
// --------------------------------------------------

app.get('/api/v1/health', (req, res) => {
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
