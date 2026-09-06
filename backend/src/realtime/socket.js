const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/jwt');

let io = null;

/**
 * initSocket — attaches Socket.IO to the existing HTTP server. Clients join a
 * room per hospitalId (and a city room) so broadcasts only reach the people
 * viewing that hospital/city, not the whole app.
 *
 * Auth: the client sends its access token in the connection handshake; we
 * verify it exactly like an HTTP request so unauthenticated sockets don't
 * receive operational data.
 */
const initSocket = (httpServer, corsOptions) => {
  io = new Server(httpServer, { cors: corsOptions });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('unauthorized'));
      const payload = verifyAccessToken(token);
      socket.user = { id: payload.sub, role: payload.role, hospitalId: payload.hospitalId, cityId: payload.cityId };
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join:hospital', (hospitalId) => {
      if (hospitalId) socket.join(`hospital:${hospitalId}`);
    });
    socket.on('join:city', (city) => {
      if (city) socket.join(`city:${city}`);
    });
  });

  return io;
};

/**
 * emitToHospital — broadcast a real-time event to everyone watching a hospital.
 * event examples: 'bed:update', 'doctor:update', 'opd:update', 'inventory:update', 'admission:decided'
 */
const emitToHospital = (hospitalId, event, payload) => {
  if (!io || !hospitalId) return;
  io.to(`hospital:${hospitalId}`).emit(event, payload);
};

const emitToCity = (city, event, payload) => {
  if (!io || !city) return;
  io.to(`city:${city}`).emit(event, payload);
};

module.exports = { initSocket, emitToHospital, emitToCity };
