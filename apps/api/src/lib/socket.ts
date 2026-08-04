import { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import { verifyAccessToken } from "./jwt.js";
import { setOnline, setOffline } from "./redis.js";
import { websocketConnections } from "./metrics.js";

let io: SocketServer;

/**
 * Initialize the Socket.IO server with JWT authentication and online-status tracking.
 * @param httpServer - The HTTP server to attach Socket.IO to.
 * @returns The configured Socket.IO server instance.
 */
export function setupSocket(httpServer: HttpServer) {
  const isProduction = process.env.NODE_ENV === "production";
  const siteUrl = process.env.SITE_URL || "http://localhost";

  io = new SocketServer(httpServer, {
    cors: {
      origin: isProduction
        ? siteUrl
        : (origin, cb) => {
            if (!origin || origin.startsWith("http://localhost")) cb(null, true);
            else cb(null, siteUrl);
          },
      credentials: true,
    },
    // Reconnection resilience
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Missing token"));
    }
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.userId;
      socket.data.username = payload.username;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId as string;
    websocketConnections.inc();
    await setOnline(userId);

    socket.on("heartbeat", async () => {
      await setOnline(userId);
    });

    socket.on("disconnect", async () => {
      websocketConnections.dec();
      await setOffline(userId);
    });
  });

  return io;
}

/**
 * Return the shared Socket.IO server instance.
 * @returns The Socket.IO server.
 */
export function getIO(): SocketServer {
  return io;
}
