import http from 'http';
import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';
import { initSocket } from './socket/socketHandler.js';
import { startRadiusScheduler } from './jobs/radiusScheduler.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const startServer = async () => {
  // 1. Connect to MongoDB
  await connectDB();

  // 2. Create HTTP Server
  const httpServer = http.createServer(app);

  // 3. Initialize Socket.IO
  initSocket(httpServer, CLIENT_ORIGIN);

  // 4. Start HTTP Server
  httpServer.listen(PORT, () => {
    console.log(`[Server] Blood Connect API running on http://localhost:${PORT}`);
    console.log(`[Server] Health Check available at http://localhost:${PORT}/api/v1/health`);

    // 5. Start background adaptive radius evaluation engine
    startRadiusScheduler();
  });

  // Graceful shutdown handling
  const shutdown = () => {
    console.log('\n[Server] Gracefully shutting down...');
    httpServer.close(() => {
      console.log('[Server] HTTP and Socket server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
