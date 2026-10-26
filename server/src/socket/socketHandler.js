import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

let ioInstance = null;

export const initSocket = (httpServer, clientOrigin) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
          /^https:\/\/.*\.vercel\.app$/.test(origin) ||
          origin === 'https://blood-connect-two-weld.vercel.app' ||
          origin === clientOrigin ||
          origin === process.env.CLIENT_ORIGIN
        ) {
          return callback(null, true);
        }
        callback(null, true);
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket authentication middleware
  ioInstance.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication required for socket connection'));
      }

      const secret = process.env.JWT_SECRET || 'super_secret_jwt_blood_connect_2026_key_918237';
      const decoded = jwt.verify(token, secret);
      const user = await User.findById(decoded.id).select('_id username email role');

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token for socket'));
    }
  });

  ioInstance.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`[Socket] User connected: ${socket.user.username} (${userId})`);

    // Join user-specific private notification room
    socket.join(`user:${userId}`);

    // Join a blood request room for real-time live radar updates
    socket.on('join:request', (requestId) => {
      if (requestId) {
        socket.join(`request:${requestId}`);
        console.log(`[Socket] ${socket.user.username} joined request room: request:${requestId}`);
      }
    });

    socket.on('leave:request', (requestId) => {
      if (requestId) {
        socket.leave(`request:${requestId}`);
        console.log(`[Socket] ${socket.user.username} left request room: request:${requestId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.user.username}`);
    });
  });

  return ioInstance;
};

export const getIO = () => {
  return ioInstance;
};

export default { initSocket, getIO };
