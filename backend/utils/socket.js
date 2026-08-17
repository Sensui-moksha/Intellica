const { Server } = require("socket.io");

let io = null;

/**
 * Initializes the Socket.IO server attached to the Node HTTP server.
 */
function initSocket(httpServer, allowedOrigins = []) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        // Allow LAN / local network IP in development
        if (process.env.NODE_ENV !== "production") {
          const isLan = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
          if (isLan) return callback(null, true);
        }
        callback(null, true); // Fallback allow
      },
      credentials: true,
      methods: ["GET", "POST"]
    },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  io.on("connection", (socket) => {
    // Client joins rooms for targeted real-time push events
    socket.on("join", (userData) => {
      if (!userData) return;
      const { role, department, userId } = userData;

      if (userId) {
        socket.join(`user:${userId}`);
      }
      if (role) {
        socket.join(`role:${String(role).toUpperCase()}`);
      }
      if (department) {
        socket.join(`dept:${String(department).toUpperCase()}`);
      }
    });

    socket.on("leave", (userData) => {
      if (!userData) return;
      const { role, department, userId } = userData;
      if (userId) socket.leave(`user:${userId}`);
      if (role) socket.leave(`role:${String(role).toUpperCase()}`);
      if (department) socket.leave(`dept:${String(department).toUpperCase()}`);
    });

    socket.on("disconnect", () => {
      // Disconnected cleanly
    });
  });

  return io;
}

function getIO() {
  return io;
}

/**
 * Emit event to a specific role (e.g. "HOD", "ADMIN", "FACULTY")
 */
function emitToRole(role, event, data) {
  if (!io || !role) return;
  const roleName = String(role).toUpperCase();
  io.to(`role:${roleName}`).emit(event, data);
}

/**
 * Emit event to a specific user by MongoDB ID
 */
function emitToUser(userId, event, data) {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Emit event to a specific department (e.g. "CSE")
 */
function emitToDepartment(dept, event, data) {
  if (!io || !dept) return;
  io.to(`dept:${String(dept).toUpperCase()}`).emit(event, data);
}

/**
 * Broadcast event to all connected clients
 */
function broadcastEvent(event, data) {
  if (!io) return;
  io.emit(event, data);
}

module.exports = {
  initSocket,
  getIO,
  emitToRole,
  emitToUser,
  emitToDepartment,
  broadcastEvent,
};
